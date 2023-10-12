"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { matrix_t, matrix_from } from "./matrix.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera, 1.3 * canvas.height / canvas.width);
const input = new input_t(canvas);

const TIMESTEP = 0.015;

class hull_t {
  constructor(vertices)
  {
    this.vertices = vertices;
  }
  
  get(pos, rot, i)
  {
    return this.vertices[i % this.vertices.length].rotate(rot).add(pos);
  }
  
  draw(pos, rot)
  {
    for (let i = 0; i < this.vertices.length; i++) {
      const p1 = this.get(pos, rot, i);
      const p2 = this.get(pos, rot, i+1);
      
      pen.line(p1, p2);
    }
  }
};

class c_clip_static_t {
  constructor(point, plane)
  {
    this.point = point;
    this.plane = plane;
  }
  
  get(T)
  {
    const pos = new vec2_t(T.get(0, 0), T.get(1, 0));
    const rot = T.get(2, 0);
    const p = pos.add(this.point.rotate(rot));
    
    return p.dot(this.plane.normal) - this.plane.distance;
  }
};

class c_dist_dynm_t {
  constructor(distance)
  {
    this.distance = distance;
  }
  
  get(T)
  {
    const a = new vec2_t(T.get(0, 0), T.get(1, 0));
    const b = new vec2_t(T.get(2, 0), T.get(3, 0));
    
    const delta = a.sub(b);
    
    return delta.length() - this.distance;
  }
};

class c_dist_static_t {
  constructor(point, distance)
  {
    this.point = point;
    this.distance = distance;
  }
  
  get(T)
  {
    const a = new vec2_t(T.get(0, 0), T.get(1, 0));
    const b = this.point;
    
    const delta = a.sub(b);
    
    return delta.length() - this.distance;
  }
};

class plane_t {
  constructor(normal, distance)
  {
    this.normal = normal;
    this.distance = distance;
  }
  
  draw()
  {
    const tangent = this.normal.cross_up(1.0);
    const a = this.normal.mulf(this.distance);
    const b = a.add(tangent);
    const c = a.add(tangent.mulf(-1));
    
    pen.line(a, a.add(this.normal.mulf(0.05)));
    pen.line(b, c);
  }
};

class clip_t {
  constructor(plane)
  {
    this.points = [];
    this.plane = plane;
  }
};

class body_t {
  constructor(hull)
  {
    this.hull = hull;
    
    this.pos = new vec2_t();
    this.rot = 0.0;
    
    this.vel = new vec2_t();
    this.ang = 0.0;
    
    this.old_pos = this.pos;
  }
  
  clip_plane(plane)
  {
    const clip = new clip_t(plane);
    
    for (let i = 0; i < this.hull.vertices.length; i++) {
      const p = this.hull.get(this.pos, this.rot, i);
      const d = p.dot(plane.normal) - plane.distance;
      
      if (d < 0) {
        clip.points.push(p);
      }
    }
    
    if (clip.points.length === 0) {
      return null;
    }
    
    return clip;
  }
  
  integrate()
  {
    this.old_pos = this.pos.copy();
    this.pos = this.pos.add(this.vel.mulf(TIMESTEP));
    this.rot += this.ang * TIMESTEP;
  }
  
  back()
  {
    this.pos = this.old_pos;
  }
  
  draw()
  {
    this.hull.draw(this.pos, this.rot);
  }
};

const square = new hull_t([
  new vec2_t(-0.2, -0.05),
  new vec2_t(-0.2, +0.05),
  new vec2_t(+0.2, +0.05),
  new vec2_t(+0.2, -0.05)
]);

const body = new body_t(square);
body.rot = Math.PI / 4.0;

const planes = [
  new plane_t(new vec2_t(0,1), -0.3),
  new plane_t(new vec2_t(1,0), -0.9),
  new plane_t(new vec2_t(-1,0), -0.9),
];

function update()
{
  pen.clear();
  pen.begin();
  
  body.vel.y -= 0.1;
  
  if (input.get_mouse_down(0)) {
    const delta = body.pos.sub(input.get_mouse_pos());
    
    body.vel.x -= delta.x * 0.4;
    body.vel.y -= delta.y * 0.4;
    body.ang += 0.01;
  }
  
  let collide = false;
  
  for (let i = 0; i < 1; i++) {
    for (const plane of planes) {
      // body.integrate();
      const clip = body.clip_plane(plane);
      // body.back();
      
      if (clip) {
        collide = true;
        for (const point of clip.points) {
          const C = [ new c_clip_static_t(point.sub(body.pos), clip.plane) ];
          
          const T = matrix_from([ [ body.pos.x, body.pos.y, 0.0 ] ]).transpose();
          const dT = matrix_from([ [ body.vel.x, body.vel.y, body.ang ] ]).transpose();
          
          const F = solve(C, T, dT, 0.5);
          
          body.vel.x += F.get(0, 0);
          body.vel.y += F.get(1, 0);
          body.ang += F.get(2, 0) * 10;
        }
      }
    }
  }
  
  body.integrate();
  
  if (collide) {
    body.vel = body.vel.mulf(0.9);
    body.ang *= 0.99;
  }
  
  body.draw();
  
  for (const plane of planes) {
    plane.draw();
  }
  
  pen.stroke();
}

function solve(C, T, dT, beta)
{
  const M = matrix_from([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 0.1]
  ]);
  
  const J = J_calc(C, T);
  const Jt = J.transpose();
  const Jv = J.mul(dT);
  const J_M_Jt = J.mul(M).mul(Jt);
  
  const bias = matrix_from(C.map((C_i) => [beta / TIMESTEP * C_i.get(T)]));
  const lambda = J_M_Jt.inverse().mul(Jv.add(bias).mulf(-1));
  
  if (lambda.get(0,0) < 0) {
    lambda.set(0,0, 0);
  }
  
  const F = Jt.mul(lambda);
  
  return F;
}

function J_calc(C, p)
{
  const h = 0.001;
  
  const J = new matrix_t(C.length, p.row);
  
  for (let i = 0; i < C.length; i++) {
    const C_p = C[i].get(p);
    
    for (let j = 0; j < p.row; j++) {
      const p_j = p.get(j, 0);
      
      p.set(j, 0, p_j + h);
      const dC_dp_j = (C[i].get(p) - C_p) / h;
      p.set(j, 0, p_j);
      
      J.set(i, j, dC_dp_j);
    }
  }
  
  return J;
}
update();

setInterval(function() {
  update();
}, 16);
