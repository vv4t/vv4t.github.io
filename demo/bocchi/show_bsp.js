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
const DOT_DEGREE = 0.1;
const MIN_SLOPE = 0.8;
const FRICTION = 10.0;
const GRAVITY = 19;

let mdl;

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
  
  show_behind = faces;
  next_split();
});

let show_plane = null;
let show_behind = [];
const ahead_queue = [];

function next_split()
{
  if (show_behind.length == 0) {
    const [hull,color] = ahead_queue.pop();
    show_behind = hull;
  }
  
  const plane = face_to_plane(show_behind[0]);
  
  const [behind, middle, ahead] = split_brush(show_behind, plane);
  
  show_plane = plane;
  show_behind = behind;
  
  if (ahead.length > 0) {
    const color = `rgb(${125 + Math.random() * 128}, ${128 + Math.random() * 128}, ${128 + Math.random() * 128})`;
    ahead_queue.push([ahead, color]);
  }
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
    } else if (face.normal.dot(plane.normal) > 1 - DOT_DEGREE) {
      return [ [], [face], [] ];
    } else {
      return [ [], [], [] ];
    }
  } else if (middle.length == 2) {
    if (behind.length > ahead.length) {
      return [ [face], [], [] ];
    } else {
      return [ [], [], [face] ];
    }
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

input.bind(key.code(" "), () => {
  next_split();
});

function update()
{
  free_look();
  free_move();
  
  pen.clear();
  
  pen.begin();
  pen.color("rgb(0,0,0)");
  draw_plane(show_plane);
  draw_mesh(new mesh_t(show_behind));
  pen.stroke();
  
  for (const [ahead,color] of ahead_queue) {
    pen.begin();
    pen.color(color);
    draw_mesh(new mesh_t(ahead));
    pen.stroke();
  }
  
  camera.pos = sphere.pos;
}

function draw_plane(plane)
{
  const v = plane.normal.cross(new vec3_t(plane.normal.x + 1, plane.normal.y + 1, plane.normal.z + 1));
  
  const tangent = plane.normal.cross(v.normalize());
  const bitangent = plane.normal.cross(tangent);
  
  const p = plane.normal.mulf(plane.distance);
  
  const s = 2;
  
  for (let x = -10; x <= 10; x++) {
    const y = p.add(bitangent.mulf(x * s));
    
    const a = tangent.mulf(-10 * s).add(y);
    const b = tangent.mulf(+10 * s).add(y)
    
    pen3d.line(a, b);
  }
  
  for (let x = -10; x <= 10; x++) {
    const y = p.add(tangent.mulf(x * s));
    
    const a = bitangent.mulf(-10 * s).add(y);
    const b = bitangent.mulf(+10 * s).add(y)
    
    pen3d.line(a, b);
  }
  
  pen3d.line(p, p.add(plane.normal));
  pen3d.circle(p, 0.25);
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
