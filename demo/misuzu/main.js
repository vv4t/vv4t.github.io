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
const pen3d = new pen3d_t(pen, camera, canvas.height / canvas.width);
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
  // TODO: bevel planes or something other algo
  
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

class player_t {
  constructor()
  {
    this.pos = new vec3_t(0, 1.5, 0);
    this.vel = new vec3_t();
    this.next_jump = time;
    this.on_ground = false;
    this.capsule = new capsule_t(this.pos, 0.5, 1.3);
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
  
  walk_move()
  {
    const SPD = 3 * 0.015;
    const cmd_dir = new vec3_t();
    if (input.get_key(key.code("W")))
      cmd_dir.z++;
    if (input.get_key(key.code("A")))
      cmd_dir.x--;
    if (input.get_key(key.code("S")))
      cmd_dir.z--;
    if (input.get_key(key.code("D")))
      cmd_dir.x++;
    
    const wish_dir = cmd_dir.rotate_zyx(camera.rot);
    wish_dir.y = 0;
    
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
  
  update(map)
  {
    this.capsule.pos = this.pos.copy();
    
    this.apply_gravity();
    this.walk_move();
    this.integrate_capsule();
    this.clip_map(map);
    this.integrate();
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
    draw_model(map_model);
    pen3d.circle(spawn_point, 0.5);
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
