"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { obj_load } from "./obj.js";

const C_TIMESTEP = 0.015;
const C_GRAVITY = 19;
const C_MIN_SLOPE = 0.8;
const C_FRICTION = 4.0;

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera, 1.3 * canvas.height / canvas.width);
const input = new input_t(canvas);

let time = 0;

class plane_t {
  constructor(normal, dist)
  {
    this.normal = normal;
    this.dist = dist;
  }
};

class hull_t {
  constructor(planes, bevels)
  {
    this.planes = planes;
    this.bevels = bevels;
  }
};

class map_t {
  constructor(hulls)
  {
    this.hulls = hulls;
  }
};

function face_to_plane(face)
{
  const normal = face.normal.copy();
  const dist = face.vertices[0].dot(normal);
  return new plane_t(normal, dist);
}

function mesh_to_hull(mesh)
{
  const planes = [];
  const bevels = [];
  
  for (let i = 0; i < mesh.faces.length; i++) {
    let unique_plane = true;
    for (const plane of planes) {
      let verts_on_plane = 0;
      for (const vertex of mesh.faces[i].vertices) {
        const vert_dist  = vertex.dot(plane.normal) - plane.dist;
        if (Math.abs(vert_dist) < 0.1)
          verts_on_plane++;
      }
      
      if (verts_on_plane == 3) {
        unique_plane = false;
        break;
      }
    }
    
    for (let j = i + 1; j < mesh.faces.length; j++) {
      let shared_verts = [];
      
      for (let k = 0; k < 3; k++) {
        for (let l = 0; l < 3; l++) {
          const delta_pos = mesh.faces[i].vertices[k].sub(mesh.faces[j].vertices[l]);
          if (delta_pos.dot(delta_pos) < 0.1 * 0.1)
            shared_verts.push(mesh.faces[i].vertices[k]);
        }
      }
      
      if (shared_verts.length == 2) {
        const normal = mesh.faces[i].normal.add(mesh.faces[j].normal).normalize();
        const dist = shared_verts[0].dot(normal);
        bevels.push(new plane_t(normal, dist));
      }
    }
    
    if (unique_plane)
      planes.push(face_to_plane(mesh.faces[i]));
  }
  
  return new hull_t(planes, bevels);
}

function model_to_map(model)
{
  const hulls = [];
  
  for (const mesh of model.meshes)
    hulls.push(mesh_to_hull(mesh));
  
  return new map_t(hulls);
} 

class capsule_t {
  constructor(pos, radius, height)
  {
    this.pos = pos;
    this.radius = radius;
    this.height = height;
  }
}

class clip_t {
  constructor(normal, dist)
  {
    this.normal = normal;
    this.dist = dist;
  }
};

function clip_capsule_plane(capsule, plane)
{
  const clip_dist_1 = capsule.pos.dot(plane.normal) - plane.dist;
  const clip_dist_2 = capsule.pos.sub(new vec3_t(0, capsule.height, 0)).dot(plane.normal) - plane.dist;
  
  const clip_dist = Math.min(clip_dist_1, clip_dist_2) - capsule.radius;
  
  const clip_normal = plane.normal.copy();
  
  if (clip_dist < 0)
    return new clip_t(clip_normal, clip_dist);
  else
    return null;
}

function clip_capsule_hull(capsule, hull)
{
  let max_clip_dist = -1000;
  let max_clip_normal;
  
  for (const plane of hull.planes) {
    const plane_clip = clip_capsule_plane(capsule, plane);
    
    if (plane_clip) {
      if (plane_clip.dist > max_clip_dist) {
        max_clip_dist = plane_clip.dist;
        max_clip_normal = plane_clip.normal.copy(); 
      }
    } else {
      return null;
    }
  }
  
  for (const plane of hull.bevels) {
    if (!clip_capsule_plane(capsule, plane))
      return null;
  }
  
  return new clip_t(max_clip_normal, max_clip_dist);
}

function clip_capsule_map(capsule, map)
{
  const clips = [];
  
  for (const hull of map.hulls) {
    const clip = clip_capsule_hull(capsule, hull);
    
    if (clip)
      clips.push(clip)
  }
  
  return clips;
}

function free_look()
{
  const sensitivity = document.getElementById("sensitivity").value / 10 * 0.6;
  
  if (input.lock_status()) {
    camera.rot.x = -input.get_mouse_pos().y * 2 * Math.PI * sensitivity;
    camera.rot.y = -input.get_mouse_pos().x * 2 * Math.PI * sensitivity;
  } else if (input.get_mouse_down()) {
    input.lock();
  }
}

function draw_mesh(mesh)
{
  for (const face of mesh.faces) {
    pen3d.line(face.vertices[0], face.vertices[1]);
    pen3d.line(face.vertices[1], face.vertices[2]);
    pen3d.line(face.vertices[2], face.vertices[0]);
  }
}

function draw_model(model)
{
  for (const mesh of model.meshes)
    draw_mesh(mesh);
}

class hook_t {
  constructor()
  {
    this.pos = new vec3_t();
    this.vel = new vec3_t();
    this.capsule = new capsule_t(this.pos, 0.1, 0.0);
    this.length = 0.0;
    this.active = false;
    this.anchor = false;
  }
  
  shoot(origin, dir)
  {
    this.pos = origin.copy();
    this.vel = dir.normalize().mulf(250);
    this.active = true;
    this.anchor = false;
    this.length = 0;
  }
  
  update(map)
  {
    if (!this.active || this.anchor)
      return;
    
    this.pos = this.pos.add(this.vel.mulf(C_TIMESTEP));
    this.capsule.pos = this.pos.copy();
    this.length += this.vel.length() * C_TIMESTEP;
    
    const clips = clip_capsule_map(this.capsule, map);
    
    if (clips.length > 0) {
      this.vel = new vec3_t();
      this.anchor = true;
    }
    
    if (this.length > 300)
      this.release();
  }
  
  release()
  {
    this.active = false;
    this.anchor = false;
  }
};

class player_t {
  constructor()
  {
    this.pos = new vec3_t(0, 1.5, 0);
    this.vel = new vec3_t();
    this.hook_1 = new hook_t();
    this.hook_2 = new hook_t();
    this.next_jump = time;
    this.on_ground = false;
    this.capsule = new capsule_t(this.pos, 0.5, 1.3);
    
    this.is_gas = false;
    this.is_reel_out = false;
    this.is_reel_in = false;
    this.is_forward = false;
    this.is_left = false;
    this.is_back = false;
    this.is_right = false;
    this.is_hook_1 = false;
    this.is_hook_2 = false;
    
    input.bind(key.code("W"), () => this.is_forward = true, () => this.is_forward = false);
    input.bind(key.code("A"), () => this.is_left = true, () => this.is_left = false);
    input.bind(key.code("S"), () => this.is_back = true, () => this.is_back = false);
    input.bind(key.code("D"), () => this.is_right = true, () => this.is_right = false);
    
    input.bind(key.code("Q"), () => this.is_hook_2 = true, () => this.is_hook_2 = false);
    input.bind(key.code("E"), () => this.is_hook_1 = true, () => this.is_hook_1 = false);
    
    input.bind(key.ALT, () => this.is_reel_out = true, () => this.is_reel_out = false);
    input.bind(key.SHIFT, () => this.is_gas = true, () => this.is_gas = false);
    input.bind(key.code(" "), () => this.is_reel_in = true, () => this.is_reel_in = false);
    
    input.bind(key.WHEEL_DOWN, () => this.reel_in());
  }
  
  apply_gravity()
  {
    this.vel.y -= C_GRAVITY * C_TIMESTEP;
  }
  
  integrate()
  {
    this.pos = this.pos.add(this.vel.mulf(C_TIMESTEP));
  }
  
  integrate_capsule()
  {
    this.capsule.pos.add(this.vel.mulf(C_TIMESTEP));
  }
  
  clip_map(map)
  {
    const clips = clip_capsule_map(this.capsule, map);
    
    const clip_vel = this.vel.copy();
    
    this.on_ground = false;
    for (const clip of clips) {
      if (clip.normal.y > C_MIN_SLOPE)
        this.on_ground = true;
      
      const beta = clip.dist * 0.1 / C_TIMESTEP;
      const lambda = -(clip_vel.dot(clip.normal) + beta);
      
      if (lambda > 0)
        this.vel = this.vel.add(clip.normal.mulf(lambda));
    }
  }
  
  apply_friction()
  {
    const drop = 1.0 - C_FRICTION * C_TIMESTEP;
    this.vel = this.vel.mulf(drop);
  }
  
  air_accelerate(wish_dir, wish_speed)
  {
    const current_speed = this.vel.dot(wish_dir);
    const add_speed = wish_speed - current_speed;
    
    if (add_speed < 0)
      return;
    
    this.vel = this.vel.add(wish_dir.mulf(add_speed));
  }
  
  accelerate(wish_dir, accel, wish_speed)
  {
    const current_speed = this.vel.dot(wish_dir);
    const add_speed = wish_speed - current_speed;
    
    if (add_speed < 0)
      return;
    
    const accel_speed = accel * wish_speed * C_TIMESTEP;
    
    if (accel_speed > wish_speed)
      accel_speed = add_speed;
    
    this.vel = this.vel.add(wish_dir.mulf(accel_speed));
  }
  
  gas(wish_dir)
  {
    const f_move = wish_dir.mulf(10);
    const f_accel = this.vel.normalize();
    const accel_dir = f_accel.add(f_move);
    
    this.vel = this.vel.add(accel_dir.mulf(C_TIMESTEP));
  }
  
  manuver()
  {
    const wish_dir = this.get_wish_dir();
    
    const look_dir = new vec3_t(0, 0, 1).rotate_zxy(camera.rot);
    
    if (this.is_hook_2) {
      if (!this.hook_2.active)
        this.hook_2.shoot(this.pos, look_dir);
    } else {
      if (this.hook_2.anchor)
        this.hook_2.release();
    }
    
    if (this.is_hook_1) {
      if (!this.hook_1.active)
        this.hook_1.shoot(this.pos, look_dir);
    } else {
      if (this.hook_1.anchor)
        this.hook_1.release();
    }
    
    if (this.on_ground) {
      this.accelerate(wish_dir, 6.5, 9.0);
      
      if (this.is_gas && time > this.next_jump) {
        this.vel.y += 600 * C_TIMESTEP;
        this.next_jump = time + 0.1;
      } else {
        this.apply_friction();
      }
    } else {
      if (this.is_gas)
        this.gas(wish_dir);
    }
    
    if (this.is_reel_in)
      this.reel_in();
  }
  
  get_wish_dir()
  {
    const SPD = 3 * 0.015;
    const cmd_dir = new vec3_t();
    if (this.is_forward)
      cmd_dir.z++;
    if (this.is_left)
      cmd_dir.x--;
    if (this.is_back)
      cmd_dir.z--;
    if (this.is_right)
      cmd_dir.x++;
    
    return cmd_dir.rotate_y(camera.rot.y);
  }
  
  walk_move()
  {
    const wish_dir = this.get_wish_dir();
    
    if (this.on_ground) {
      this.accelerate(wish_dir, 6.5, 9.0);
      
      if (input.get_key(key.code(" ")) && time > this.next_jump) {
        this.vel.y += 600 * C_TIMESTEP;
        this.next_jump = time + 0.1;
      } else {
        this.apply_friction();
      }
    } else {
      this.air_accelerate(wish_dir, 2.5);
    }
  }
  
  is_perp(hook)
  {
    if (hook.anchor) {
      const dist_pos = this.pos.dot(this.vel);
      const hook_pos = hook.pos.dot(this.vel);
      
      return dist_pos > hook_pos;
    }
    
    return false;
  }
  
  reel_in()
  {
    let hook_dir = new vec3_t();
    
    if (this.is_perp(this.hook_1))
      hook_dir = this.pos.sub(this.hook_1.pos);
    
    if (this.is_perp(this.hook_2))
      hook_dir = hook_dir.add(this.pos.sub(this.hook_2.pos));
    
    if (hook_dir.dot(hook_dir) < 0.01)
      return;
    
    const lambda = -60 * Math.PI / 180 * this.vel.length();
    const a = this.vel.mulf(-0.6);
    const b = hook_dir.normalize().mulf(lambda);
    const f_reel = a.add(b);
    
    this.vel = this.vel.add(f_reel);
  }
  
  hook_constrain()
  {
    let f_hook = new vec3_t();
    let f_pull = new vec3_t();
    
    if (this.hook_1.anchor) {
      const hook_dir = this.pos.sub(this.hook_1.pos);
      
      if (this.is_perp(this.hook_1)) {
        if (this.is_gas) {
          if (!this.is_reel_out) {
            const theta = this.vel.length() * C_TIMESTEP / hook_dir.length();
            const up_axis = hook_dir.mulf(-1).cross(this.vel).normalize();
            const perp_dir = hook_dir.cross(up_axis).normalize();
            f_hook = f_hook.add(perp_dir);
          }
        } else {
          this.vel = this.vel.mulf(0.97);
        }
      }
      
      if (!this.is_reel_out)
        f_pull = f_pull.add(hook_dir.mulf(-0.7 * C_TIMESTEP));
    }
    
    if (this.hook_2.anchor) {
      const hook_dir = this.pos.sub(this.hook_2.pos);
      
      if (this.is_perp(this.hook_2)) {
        if (this.is_gas) {
          if (!this.is_reel_out) {
            const theta = this.vel.length() * C_TIMESTEP / hook_dir.length();
            const up_axis = hook_dir.mulf(-1).cross(this.vel).normalize();
            const perp_dir = hook_dir.cross(up_axis).normalize();
            f_hook = f_hook.add(perp_dir);
          }
        } else {
          this.vel = this.vel.mulf(0.97);
        }
      }
      
      if (!this.is_reel_out)
        f_pull = f_pull.add(hook_dir.mulf(-0.7 * C_TIMESTEP));
    }
    
    if (f_hook.length() > 0)
      f_hook = f_hook.normalize().mulf(this.vel.length()).sub(this.vel);
    
    const f_net = f_hook.add(f_pull);
    
    this.vel = this.vel.add(f_net);
  }
  
  update(map)
  {
    this.capsule.pos = this.pos.copy();
    
    this.apply_gravity();
    this.manuver();
    this.hook_constrain();
    this.integrate_capsule();
    this.clip_map(map);
    this.integrate();
    
    this.hook_1.update(map);
    this.hook_2.update(map);
  }
};

(function() {
  const player = new player_t();
  let spawn_point = new vec3_t(0, 2.0, 0);
  let map;
  let map_model;
  
  function start(model)
  {
    map = model_to_map(model);
    map_model = model;
  }

  function update()
  {
    if (input.get_key(key.code("T")))
      player.pos = spawn_point.copy();
    if (input.get_key(key.code("C")))
      spawn_point = player.pos.copy();
    if (input.get_key(key.code("R"))) {
      spawn_point = new vec3_t(0, 2.0, 0);
      player.pos = new vec3_t(0, 2.0, 0);
    }
    
    free_look();
    
    player.update(map);
    camera.pos = player.pos.copy();
    
    pen.clear();
    
    pen.begin();
    pen.color("black");
    
    draw_model(map_model);
    pen3d.circle(spawn_point, 0.5);
    
    pen.stroke();
    
    pen.begin();
    pen.color("red");
    
    if (player.hook_1.active) {
      pen3d.circle(player.hook_1.pos, player.hook_1.capsule.radius);
      pen3d.line(player.pos.add(new vec3_t(0, 0, 0.1).rotate_zyx(camera.rot)).add(new vec3_t(0, -0.5, 0)), player.hook_1.pos);
    }
    
    if (player.hook_2.active) {
      pen3d.circle(player.hook_2.pos, player.hook_2.capsule.radius);
      pen3d.line(player.pos.add(new vec3_t(0, 0, 0.1).rotate_zyx(camera.rot)).add(new vec3_t(0, -0.5, 0)), player.hook_2.pos);
    }
    
    pen.stroke();
    
    pen.begin();
    pen.color("green");
    pen.line(new vec2_t(0, -0.01), new vec2_t(0, 0.01));
    pen.line(new vec2_t(-0.01, 0), new vec2_t(0.01, 0));
    pen.stroke();
  }

  obj_load("assets/untitled.obj", (model) => {
    start(model);
    setInterval(function () {
      update();
      time += C_TIMESTEP;
    }, C_TIMESTEP * 1000);
  });
})();
