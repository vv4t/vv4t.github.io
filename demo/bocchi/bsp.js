"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { face_t, mesh_t, obj_load } from "../misuzu/obj.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera);
const input = new input_t(canvas);

const TIMESTEP = 0.015;
const DOT_DEGREE = 0.01;
const MIN_SLOPE = 0.8;
const FRICTION = 10.0;
const GRAVITY = 19;

let bsp;
let mdl;
const hulls = [];

class plane_t {
  constructor(normal, distance)
  {
    this.normal = normal;
    this.distance = distance;
  }
};

class bsp_node_t {
  constructor(plane)
  {
    this.plane = plane;
    this.behind = null;
    this.ahead = null;
    this.bevel = false;
  }
};

class sphere_t {
  constructor(pos, radius)
  {
    this.pos = pos;
    this.radius = radius;
  }
};

const sphere = new sphere_t(new vec3_t(1, 4, 0), 0.5);

obj_load("bsp.obj", (model) => {
  mdl = model;
  
  const faces = [];
  for (const mesh of model.meshes)
    faces.push(...mesh.faces);
  
  for (const face of faces) {
    const plane = face_to_plane(face);
    
    for (let i = 0; i < face.vertices.length; i++) {
      const dist = face.vertices[i].dot(plane.normal) - plane.distance;
      face.vertices[i] = face.vertices[i].add(plane.normal.mulf(-dist));
    }
  }
  
  bsp = collapse_brush_R(faces, [], []);
});

function clip_sphere_bsp_R(sphere, node, clip_nodes, min_dist, min_node)
{
  if (!node)
    return;
  
  const max_d = sphere.pos.dot(node.plane.normal) - node.plane.distance + sphere.radius;
  const min_d = sphere.pos.dot(node.plane.normal) - node.plane.distance - sphere.radius;
  
  if (max_d > 0)
    clip_sphere_bsp_R(sphere, node.ahead, clip_nodes, min_dist, min_node);
  
  if (min_d < 0) {
    if (min_d > min_dist && !node.bevel) {
      min_dist = min_d;
      min_node = node;
    }
    
    if (!node.behind)
      clip_nodes.push(min_node);
    
    clip_sphere_bsp_R(sphere, node.behind, clip_nodes, min_dist, min_node);
  }
}
/*
function clip_ray_bsp_R(a, b, node, under, hit_node)
{
  if (!node) {
    if (under) {
      
      pen.begin();
      pen.color("red");
      
      if (hit_node) {
        const p = a.add(hit_node.plane.normal.mulf(0.5));
        pen3d.circle(p, 0.2);
        pen3d.line(p, p.add(hit_node.plane.normal.mulf(0.5)));
      }
      
      pen.stroke();
      
      return true;
    }
    
    return false;
  }
  
  const plane = new plane_t(node.plane.normal, node.plane.distance + 0.5);
  
  const depth_a = a.dot(plane.normal) - plane.distance;
  const depth_b = b.dot(plane.normal) - plane.distance;
  
  if (depth_a < 0) {
    if (depth_b < 0) {
      return clip_ray_bsp_R(a, b, node.behind, true, hit_node);
    } else {
      const c = intersect_plane(a, b, plane);
      return clip_ray_bsp_R(a, c, node.behind, true, hit_node) || clip_ray_bsp_R(c, b, node.ahead, false, hit_node);
    }
  } else {
    if (depth_b > 0) {
      return clip_ray_bsp_R(a, b, node.ahead, false, hit_node);
    } else {
      const c = intersect_plane(a, b, plane);
      console.log("WHAT");
      return clip_ray_bsp_R(a, c, node.ahead, false, hit_node) || clip_ray_bsp_R(c, b, node.behind, true, node);
    }
  }
}
*/

function clip_ray_bsp_R(a, b, node, under, hit_node)
{
  if (!node) {
    if (under) {
      pen.begin();
      pen.color("red");
      
      if (hit_node) {
        const p = a.add(hit_node.plane.normal.mulf(0.5));
        pen3d.circle(a, 0.2);
        pen3d.line(a, a.add(hit_node.plane.normal.mulf(0.5)));
      }
      
      pen.stroke();
      
      return true;
    }
    
    return false;
  }
  
  const R = 0.5;
  
  let hit = null;
  
  if (node.plane.normal.dot(b.sub(a)) > 0) {
    const hit_under = ray_under(new plane_t(node.plane.normal, node.plane.distance + R), a, b);
    if (hit_under) {
      const [u, v, split] = hit_under;
      hit = clip_ray_bsp_R(u, v, node.behind, true, hit_node);
    }
    
    const hit_over = ray_over(new plane_t(node.plane.normal, node.plane.distance - R), a, b);
    if (hit_over) {
      const [u, v, split] = hit_over;
      hit ||= clip_ray_bsp_R(u, v, node.ahead, false, hit || hit_node);
    }
  } else {
    const hit_over = ray_over(new plane_t(node.plane.normal, node.plane.distance - R), a, b);
    if (hit_over) {
      const [u, v, split] = hit_over;
      hit = clip_ray_bsp_R(u, v, node.ahead, false, hit_node);
    }
    
    const hit_under = ray_under(new plane_t(node.plane.normal, node.plane.distance + R), a, b);
    if (hit_under) {
      const [u, v, split] = hit_under;
      if (split) {
        hit ||= clip_ray_bsp_R(u, v, node.behind, true, node);
      } else {
        hit ||= clip_ray_bsp_R(u, v, node.behind, true, hit || hit_node);
      }
    }
  }
  
  return hit || hit_node;
}

function clip_point_bsp_R(p, node, min_node, min_dist)
{
  if (!node) {
    return null;
  }
  
  // console.log(node.plane.normal, node.plane.distance);
  
  const dist = p.dot(node.plane.normal) - node.plane.distance - 0.5;
   
  if (dist < 0) {
    if (dist > min_dist) {
      min_node = node;
      min_dist = dist;
    }
    
    if (!node.behind) {
      return min_node;
    }
    
    return clip_point_bsp_R(p, node.behind, min_node, min_dist);
  } else {
    return clip_point_bsp_R(p, node.ahead, min_node, min_dist);
  }
}

function clip_trace_bsp_R(a, b, node, under, hit_node)
{
  if (!node) {
    if (under) {
      return hit_node;
    }
    
    return null;
  }
  
  let hit = null;
  
  const R = 0.5;
  
  if (node.plane.normal.dot(b.sub(a)) > 0) {
    const hit_under = ray_under(new plane_t(node.plane.normal, node.plane.distance + R), a, b);
    if (hit_under) {
      const [u, v, split] = hit_under;
      hit ||= clip_trace_bsp_R(u, v, node.behind, true, hit_node);
    }
    
    const hit_over = ray_over(new plane_t(node.plane.normal, node.plane.distance - R), a, b);
    if (hit_over) {
      const [u, v, split] = hit_over;
      hit ||= clip_trace_bsp_R(u, v, node.ahead, false, hit || hit_node);
    }
  } else {
    const hit_over = ray_over(new plane_t(node.plane.normal, node.plane.distance - R), a, b);
    if (hit_over) {
      const [u, v, split] = hit_over;
      hit ||= clip_trace_bsp_R(u, v, node.ahead, false, hit_node);
    }
    
    const hit_under = ray_under(new plane_t(node.plane.normal, node.plane.distance + R), a, b);
    
    if (hit_under) {
      const [u, v, split] = hit_under;
      if (split) {
        hit = clip_trace_bsp_R(u, v, node.behind, true, node);
      } else {
        hit ||= clip_trace_bsp_R(u, v, node.behind, true, hit || hit_node);
      }
    }
  }
  
  return hit;
  
  /*
  if (!node) {
    if (under) {
      if (!hit_node) {
        return clip_point_bsp_R(a, bsp, null, -1000.0);
      }
      
      return hit_node;
    }
    
    return null;
  }
  
  const plane = new plane_t(node.plane.normal, node.plane.distance + 0.5);
  
  const depth_a = a.dot(plane.normal) - plane.distance;
  const depth_b = b.dot(plane.normal) - plane.distance;
  
  if (depth_a < 0) {
    if (depth_b < 0) {
      return clip_trace_bsp_R(a, b, node.behind, true, hit_node);
    } else {
      const c = intersect_plane(a, b, plane);
      return clip_trace_bsp_R(a, c, node.behind, true, hit_node) || clip_trace_bsp_R(c, b, node.ahead, false, hit_node);
    }
  } else {
    if (depth_b > 0) {
      return clip_trace_bsp_R(a, b, node.ahead, false, hit_node);
    } else {
      const c = intersect_plane(a, b, plane);
      return clip_trace_bsp_R(a, c, node.ahead, false, hit_node) || clip_trace_bsp_R(c, b, node.behind, true, node);
    }
  }*/
  
}

function ray_over(plane, a, b)
{
  const depth_a = a.dot(plane.normal) - plane.distance;
  const depth_b = b.dot(plane.normal) - plane.distance;
  
  if (depth_a > 0) {
    if (depth_b > 0) {
      return [a, b, false];
    } else {
      const c = intersect_plane(a, b, plane);
      return [a, c, true];
    }
  } else {
    if (depth_b > 0) {
      const c = intersect_plane(a, b, plane);
      return [c, b, true];
    } else {
      return null;
    }
  }
}

function ray_under(plane, a, b)
{
  const depth_a = a.dot(plane.normal) - plane.distance;
  const depth_b = b.dot(plane.normal) - plane.distance;
  
  if (depth_a > 0) {
    if (depth_b > 0) {
      return null;
    } else {
      const c = intersect_plane(a, b, plane);
      return [c, b, true];
    }
  } else {
    if (depth_b > 0) {
      const c = intersect_plane(a, b, plane);
      return [a, c, true];
    } else {
      return [a, b, false];
    }
  }
}

function collapse_brush_R(faces, hull, splits)
{
  if (faces.length == 0 && hull.length > 0) {
    const color = "rgb(" + Math.random() * 255 + "," +  Math.random() * 255 + "," + Math.random() * 255 + ")";
    hulls.push([hull, color]);
    
    return null;
    
    let node = null;
    
    const bevels = do_bevel(hull, splits);
    
    for (const bevel of bevels) {
      const new_node = new bsp_node_t(bevel);
      new_node.bevel = true;
      new_node.behind = node;
      node = new_node;
    }
    
    return node;
  } else if (faces.length == 0) {
    return null;
  }
  
  const plane = face_to_plane(faces[0]);
  
  const [behind, middle, ahead] = split_brush(faces, plane);
  const [b,m,a] = split_brush(hull, plane);
  
  const new_hull = [];
  new_hull.push(...middle);
  new_hull.push(...b);
  
  const new_splits = [];
  new_splits.push(...splits);
  new_splits.push(new plane_t(plane.normal.mulf(-1), -plane.distance));
  
  splits.push(plane);
  
  const node = new bsp_node_t(plane);
  node.behind = collapse_brush_R(behind, new_hull, splits);
  node.ahead = collapse_brush_R(ahead, a, new_splits);
  
  return node;
}

function do_bevel(hull, splits)
{
  const bevels = [];
  
  for (const split of splits) {
    for (const face of hull) {
      const shared = face.vertices.filter(
        (v) => {
          const delta = v.dot(split.normal) - split.distance;
          return Math.abs(delta) < DOT_DEGREE;
        }
      );
      
      if (shared.length > 0 && shared.length < 3 && face.normal.dot(split.normal) < -DOT_DEGREE) {
        const normal = face.normal.add(split.normal).normalize();
        const distance = shared[0].dot(normal);
        
        bevels.push(new plane_t(normal, distance));
      }
    }
  }
  
  const unique_bevels = bevels.filter((b1, i) => {
    return !bevels.some((b2, j) => {
      const alpha = b1.normal.dot(b2.normal);
      const delta = Math.abs(b1.distance - b2.distance);
      
      return alpha > 1 - DOT_DEGREE && delta < DOT_DEGREE && i > j;
    });
  });
  
  return unique_bevels;
}

function face_to_plane(face)
{
  const n = face.normal;
  const d = face.normal.dot(face.vertices[0]);
  return new plane_t(n, d)
}

function split_brush(faces, plane)
{
  const behind = [];
  const middle = [];
  const ahead = [];
  
  for (const face of faces) {
    const [ f_behind, f_middle, f_ahead ] = split_face(face, plane);
    
    behind.push(...f_behind);
    middle.push(...f_middle);
    ahead.push(...f_ahead);
  }
  
  return [ behind, middle, ahead ];
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
    if (face.normal.dot(plane.normal) < -1+DOT_DEGREE) {
      return [ [], [], [face] ];
    } else if (face.normal.dot(plane.normal) > 1-DOT_DEGREE) {
      return [ [], [face], [] ];
    } else {
      return [ [], [], [] ];
    }
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

function clip_bsp(sphere, delta_pos, bsp)
{
  /*
  let next_pos = sphere.pos.add(delta_pos);
  
  for (let i = 0; i < 1; i++) {
    // console.log("THINGGG");
    const hit_node = clip_point_bsp_R(next_pos, bsp, null, -1000.0);
    
    if (hit_node) {
      const lambda = -(next_pos.dot(hit_node.plane.normal) - hit_node.plane.distance - 0.5);
      next_pos = next_pos.add(hit_node.plane.normal.mulf(lambda));
    }
  }
  
  return next_pos;
  */
  
  let next_pos = sphere.pos.add(delta_pos);
  for (let i = 0; i < 2; i++) {
    const hit_node = clip_trace_bsp_R(sphere.pos, next_pos, bsp, false, null);
    
    if (hit_node) {
      const lambda = -(next_pos.dot(hit_node.plane.normal) - hit_node.plane.distance - 0.001 - 0.5);
      next_pos = next_pos.add(hit_node.plane.normal.mulf(lambda));
    }
  }
  
  return next_pos;
  
  /*
  const clip_nodes = [];
  const old_pos = sphere.pos.copy();
  
  sphere.pos = sphere.pos.add(delta_pos);
  clip_sphere_bsp_R(sphere, bsp, clip_nodes, -1000, null);
  
  let next_pos = sphere.pos.copy();
  
  for (const clip_node of clip_nodes) {
    const lambda = -(next_pos.dot(clip_node.plane.normal) - clip_node.plane.distance - sphere.radius);
    
    if (lambda > 0)
      next_pos = next_pos.add(clip_node.plane.normal.mulf(lambda));
  }
  
  sphere.pos = old_pos;
  */
  
  return next_pos;
}

let ray_a = new vec3_t(0,0,0);
let ray_b = new vec3_t(0,0,5);

function update()
{
  free_look();
  free_move();
  
  pen.clear();
  
  if (input.get_key(key.code(" "))) {
    ray_a = sphere.pos;
    ray_b = sphere.pos.add(new vec3_t(0,0,5).rotate_zxy(camera.rot));
  }
  
  clip_ray_bsp_R(ray_a, ray_b, bsp)
  
  hulls.forEach(([hull, color], i) => {
    pen.begin();
    pen.color(color);
    draw_mesh(new mesh_t(hull));
    pen.stroke();
  });
  
  camera.pos = sphere.pos;
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
  
  const delta_pos = move_dir.rotate_zxy(camera.rot).mulf(5 * TIMESTEP);
  const next_pos = clip_bsp(sphere, delta_pos, bsp);
  
  sphere.pos = next_pos;
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
