"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { face_t, mesh_t, obj_load } from "../misuzu/obj.js";
import { hull_t, clip_gjk } from "./gjk.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera);
const input = new input_t(canvas);

const TIMESTEP = 0.015;
const DOT_DEGREE = 0.1;
const MIN_SLOPE = 0.8;
const FRICTION = 10.0;
const GRAVITY = 19;

let bsp;
let mdl;

class plane_t {
  constructor(normal, distance)
  {
    this.normal = normal;
    this.distance = distance;
  }
};

class bsp_node_t {
  constructor(plane, faces)
  {
    this.vertices = [];
    for (const face of faces) {
      for (const v1 of face.vertices) {
        let is_unique = true;
        for (const v2 of this.vertices) {
          const d = v1.sub(v2);
          if (d.dot(d) < DOT_DEGREE) {
            is_unique = false;
            break;
          }
        }
        
        if (is_unique)
          this.vertices.push(v1);
      }
    }
    
    this.plane = plane;
    this.faces = faces;
    this.behind = null;
    this.ahead = null;
  }
};

class sphere_t {
  constructor(pos, radius)
  {
    this.pos = pos;
    this.vel = new vec3_t();
    this.radius = radius;
    this.on_ground = false;
    this.hull = new hull_t(this.pos, [ new vec3_t(0, -1, 0), new vec3_t() ], radius);
  }

  apply_gravity()
  {
    this.vel.y -= GRAVITY * TIMESTEP;
  }
  
  integrate()
  {
    this.pos = this.pos.add(this.vel.mulf(TIMESTEP));
    this.hull.pos = this.pos;
  }

  accelerate(wish_dir, accel, wish_speed)
  {
    const current_speed = this.vel.dot(wish_dir);
    const add_speed = wish_speed - current_speed;
    
    if (add_speed < 0)
      return;
    
    const accel_speed = accel * wish_speed * TIMESTEP;
    
    if (accel_speed > wish_speed)
      accel_speed = add_speed;
    
    this.vel = this.vel.add(wish_dir.mulf(accel_speed));
  }

  walk_move()
  {
    let wish_dir = new vec3_t();
    
    if (input.get_key(key.code("W")))
      wish_dir = wish_dir.add(new vec3_t(0, 0, +1));
    if (input.get_key(key.code("A")))
      wish_dir = wish_dir.add(new vec3_t(-1, 0, 0));
    if (input.get_key(key.code("S")))
      wish_dir = wish_dir.add(new vec3_t(0, 0, -1));
    if (input.get_key(key.code("D")))
      wish_dir = wish_dir.add(new vec3_t(+1, 0, 0));
    
    wish_dir = wish_dir.rotate_zxy(camera.rot);
    wish_dir.y = 0;
    wish_dir = wish_dir.normalize();
    
    if (this.on_ground) {
      this.accelerate(wish_dir, 10.0, 12.0);
      
      if (input.get_key(key.code(" "))) {
        this.vel = this.vel.add(new vec3_t(0, 20, 0));
        this.on_ground = false;
      } else
        this.apply_friction();
    } else {
      this.air_accelerate(wish_dir, 1.8);
    }
  }
  
  air_accelerate(wish_dir, wish_speed)
  {
    const current_speed = this.vel.dot(wish_dir);
    const add_speed = wish_speed - current_speed;
    
    if (add_speed < 0)
      return;
    
    this.vel = this.vel.add(wish_dir.mulf(add_speed));
  }
  
  apply_friction()
  {
    const drop = 1.0 - FRICTION * TIMESTEP;
    this.vel = this.vel.mulf(drop);
  }
  
  draw()
  {
    const up = new vec3_t(0, this.radius, 0);
    const right = new vec3_t(this.radius, 0, 0);
    const forward = new vec3_t(0, 0, this.radius);
    
    pen3d.line(this.pos.sub(up), this.pos.add(up));
    pen3d.line(this.pos.sub(right), this.pos.add(right));
    pen3d.line(this.pos.sub(forward), this.pos.add(forward));
    
    pen3d.circle(this.pos, this.radius);
  }
};

const sphere = new sphere_t(new vec3_t(1, 4, 0), 0.5);
let cube_hull;

obj_load("cube.obj", (model) => {
  const vertices = [];
  for (const mesh of model.meshes) {
    for (const face of mesh.faces) {
      for (const v1 of face.vertices) {
        let unique = true;
        for (const v2 of vertices) {
          const d_v = v2.sub(v1);
          if (d_v.dot(d_v) < 0.001) {
            unique = false;
            break;
          }
        }
        
        if (unique)
          vertices.push(v1);
      }
    }
  }
  
  cube_hull = new hull_t(new vec3_t(), vertices, 0.0);
});

obj_load("bsp.obj", (model) => {
  mdl = model;
  const faces = [];
  for (const mesh of model.meshes)
    faces.push(...mesh.faces);
  
  bsp = collapse_brush_R(new mesh_t(faces));
});

function clip_sphere_bsp_R(sphere, node, clip_nodes, min_dist, min_node)
{
  if (!node)
    return;
  
  const top_d = sphere.pos.dot(node.plane.normal) - node.plane.distance;
  const bot_d = sphere.pos.add(new vec3_t(0, -1, 0)).dot(node.plane.normal) - node.plane.distance;
  
  const max_d = Math.max(top_d, bot_d) + sphere.radius;
  const min_d = Math.min(top_d, bot_d) - sphere.radius;
  
  if (max_d > 0)
    clip_sphere_bsp_R(sphere, node.ahead, clip_nodes, min_dist, min_node);
  
  if (min_d < 0) {
    if (min_d > min_dist) {
      min_dist = min_d;
      min_node = node;
    }
    
    if (!node.behind)
      clip_nodes.push(min_node);
    
    clip_sphere_bsp_R(sphere, node.behind, clip_nodes, min_dist, min_node);
  }
}

function clip_hull_bsp_R(hull, node, clip_nodes, min_dist, min_node)
{
  if (!node)
    return;
  
  const max_d = hull.furthest_in(node.plane.normal).dot(node.plane.normal) - node.plane.distance + hull.radius;
  const min_d = hull.furthest_in(node.plane.normal.mulf(-1)).dot(node.plane.normal) - node.plane.distance - hull.radius;
  
  if (max_d > 0)
    clip_hull_bsp_R(hull, node.ahead, clip_nodes, min_dist, min_node);
  
  if (min_d < 0) {
    if (min_d > min_dist) {
      min_dist = min_d;
      min_node = node;
    }
    
    if (!node.behind)
      clip_nodes.push(min_node);
    
    clip_hull_bsp_R(hull, node.behind, clip_nodes, min_dist, min_node);
  }
}

function collapse_brush_R(brush)
{
  if (!brush)
    return;
  
  let plane = best_split_plane(brush);
  
  if (!plane)
    return;
  
  let [behind, faces, ahead] = split_brush(brush, plane);
  
  const node = new bsp_node_t(plane, faces);
  node.behind = collapse_brush_R(behind);
  node.ahead = collapse_brush_R(ahead);
  
  return node;
}

function best_split_plane(brush)
{
  let best_plane;
  let best_score = DOT_DEGREE;
  
  for (const face of brush.faces) {
    const plane = face_to_plane(face);
    const plane_score = calc_plane_score(plane, brush);
    if (plane_score > best_score) {
      best_plane = plane;
      best_score = plane_score;
    }
  }
  
  return best_plane;
}

function calc_plane_score(plane, brush)
{
  let score = 0;
  
  const [ behind, faces, ahead ] = split_brush(brush, plane);
  
  for (const face of faces) {
    const ab = face.vertices[1].sub(face.vertices[0]);
    const ac = face.vertices[2].sub(face.vertices[0]);
    
    score += 0.5 * ab.cross(ac).length();
  }
  
  if (ahead)
    score += 100000;
  
  return score;
}

function face_to_plane(face)
{
  const n = face.normal;
  const d = face.normal.dot(face.vertices[0]);
  return new plane_t(n, d)
}

function split_brush(brush, plane)
{
  const behind = [];
  const middle = [];
  const ahead = [];
  
  for (const face of brush.faces) {
    const [ f_behind, f_middle, f_ahead ] = split_face(face, plane);
    
    behind.push(...f_behind);
    middle.push(...f_middle);
    ahead.push(...f_ahead);
  }
  
  let brush_behind = null;
  if (behind.length > 0)
    brush_behind = new mesh_t(behind);
  
  let brush_ahead = null;
  if (ahead.length > 0)
    brush_ahead = new mesh_t(ahead);
  
  return [ brush_behind, middle, brush_ahead ];
}

function intersect_plane(a, b, plane)
{
  const delta_pos = b.sub(a);
  const t = -(a.dot(plane.normal) - plane.distance) / delta_pos.dot(plane.normal);
  return a.add(delta_pos.mulf(t));
}

function split_face_even(vbehind, vmiddle, vahead, plane, normal)
{
  const shared = intersect_plane(vbehind, vahead, plane);
  
  const behind = new face_t([vbehind, shared, vmiddle], normal);
  const ahead = new face_t([vahead, shared, vmiddle], normal);
  
  return [ [behind], [], [ahead] ];
}

function split_face_uneven(vbase, vhead, plane, normal, flip)
{
  const hit_a = intersect_plane(vhead, vbase[0], plane);
  const hit_b = intersect_plane(vhead, vbase[1], plane);
  
  const head = [ new face_t([hit_a, hit_b, vhead], normal) ];
  
  const base = [
    new face_t([vbase[0], vbase[1], hit_b], normal),
    new face_t([hit_b, hit_a, vbase[0]], normal)
  ];
  
  if (flip)
    return [head, [], base];
  else
    return [base, [], head];
}

function split_face(face, plane)
{
  const behind = [];
  const middle = [];
  const ahead = [];
  
  for (const vertex of face.vertices) {
    const dist = vertex.dot(plane.normal) - plane.distance;
    
    if (dist < -DOT_DEGREE) {
      behind.push(vertex);
    } else if (dist > +DOT_DEGREE) {
      ahead.push(vertex);
    } else {
      middle.push(vertex);
    }
  }
  
  if (behind.length == 3 || (behind.length == 2 && middle.length == 1)) {
    return [ [face], [], [] ];
  } else if (ahead.length == 3 || (ahead.length == 2 && middle.length == 1)) {
    return [ [], [], [face] ];
  } else if (middle.length == 3) {
    if (face.normal.dot(plane.normal) > +DOT_DEGREE)
      return [ [], [face], [] ];
    else
      return [ [], [], [face] ];
  } else if (middle.length == 2) {
    if (behind.length > ahead.length)
      return [ [face], [], [] ];
    else
      return [ [], [], [face] ];
  } else if (middle.length == 1) {
    return split_face_even(behind[0], middle[0], ahead[0], plane, face.normal);
  } else if (behind.length > ahead.length) {
    return split_face_uneven(behind, ahead[0], plane, face.normal, false);
  } else if (behind.length < ahead.length) {
    return split_face_uneven(ahead, behind[0], plane, face.normal, true);
  } else {
    throw "split_face(): unknown case";
  }
}

function clip_bsp(sphere, bsp)
{
  const clip_nodes = [];
  clip_hull_bsp_R(sphere.hull, bsp, clip_nodes, -1000, null);
  
  sphere.on_ground = false;
  for (const clip_node of clip_nodes) {
    const hull_a = new hull_t(new vec3_t(), clip_node.vertices, 0.0);
    
    const [normal, depth] = clip_gjk(hull_a, sphere.hull);
    if (normal) {
      const beta = depth * 0.1 / TIMESTEP;
      const lambda = -(sphere.vel.dot(normal) + beta);
      
      if (normal.y > MIN_SLOPE)
        sphere.on_ground = true;
      
      if (lambda > 0)
        sphere.vel = sphere.vel.add(normal.mulf(lambda));
      
      sphere.pos = sphere.pos.add(normal.mulf(depth));
    }
    
    draw_bsp(clip_node);
  }
}

function clip_bsp_2(hull, bsp)
{
  const clip_nodes = [];
  clip_hull_bsp_R(hull, bsp, clip_nodes, -1000, null);
  
  for (const clip_node of clip_nodes) {
    const hull_a = new hull_t(new vec3_t(), clip_node.vertices, 0.0);
    
    const [normal, depth] = clip_gjk(hull_a, hull);
    if (normal)
      cube_hull.pos = cube_hull.pos.add(normal.mulf(depth + 0.01));
    
    draw_bsp(clip_node);
  }
}

function grab_cube()
{
  if (input.get_mouse_down()) {
    const front_offset = new vec3_t(0, 0, 5).rotate_zxy(camera.rot);
    cube_hull.pos = cube_hull.pos.add(camera.pos.add(front_offset).sub(cube_hull.pos).mulf(TIMESTEP * 4));
    if (input.get_key(key.code("J")))
      cube_hull.rotate_x(0.01);
    if (input.get_key(key.code("K")))
      cube_hull.rotate_y(0.01);
    if (input.get_key(key.code("L")))
      cube_hull.rotate_z(0.01);
  }
}

function draw_hull(hull)
{
  for (let i = 0; i < hull.vertex_count(); i++) {
    pen3d.circle(hull.get_vertex(i), 0.05);
  }
  
  for (let i = 0; i < hull.vertex_count(); i++) {
    for (let j = i + 1; j < hull.vertex_count(); j++)
      pen3d.line(hull.get_vertex(i), hull.get_vertex(j));
  }
}

function update()
{
  free_look();
  grab_cube();
  sphere.walk_move();
  sphere.apply_gravity();
  sphere.integrate();
  
  pen.clear();
  
  pen.begin();
  pen.color("black");
    draw_bsp_R(bsp);
    draw_hull(cube_hull);
  pen.stroke();
  
  pen.begin();
  pen.color("red");
    clip_bsp(sphere, bsp);
    clip_bsp_2(cube_hull, bsp);
  pen.stroke();
  
  camera.pos = sphere.pos;
}

function draw_bsp(node)
{
  draw_mesh(node);
}

function draw_bsp_R(node)
{
  if (!node)
    return;
  
  draw_bsp(node);
  
  draw_bsp_R(node.behind);
  draw_bsp_R(node.ahead);
}

function draw_grid()
{
  for (let i = -20; i <= 20; i++)
    for (let j = -20; j <= 20; j++)
      pen3d.circle(new vec3_t(i, -1, j), 0.01);
}

function free_move()
{
  let move_dir = new vec3_t();
  
  if (input.get_key(key.code("W")))
    move_dir = move_dir.add(new vec3_t(0, 0, +1));
  if (input.get_key(key.code("A")))
    move_dir = move_dir.add(new vec3_t(-1, 0, 0));
  if (input.get_key(key.code("S")))
    move_dir = move_dir.add(new vec3_t(0, 0, -1));
  if (input.get_key(key.code("D")))
    move_dir = move_dir.add(new vec3_t(+1, 0, 0));
  
  sphere.pos = sphere.pos.add(move_dir.rotate_zxy(camera.rot).mulf(5 * TIMESTEP));
}

function free_look()
{
  const sensitivity = 0.6;
  
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
    
    const p = face.vertices[0].add(face.vertices[1]).add(face.vertices[2]).mulf(1.0/3.0);
    pen3d.circle(p, 0.05);
    pen3d.line(p, p.add(face.normal.mulf(0.3)));
  }
}

function draw_model(model)
{
  for (const mesh of model.meshes)
    draw_mesh(mesh);
}

setInterval(function() {
  update();
}, TIMESTEP * 1000);
