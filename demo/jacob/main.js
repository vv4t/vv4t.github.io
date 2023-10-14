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
    this.vertices = vertices.slice();
    this.pos = new vec2_t();
    this.planes = [];
    
    this.make_planes();
  }
  
  make_planes()
  {
    this.planes = [];
    
    for (let i = 0; i < this.vertices.length; i++) {
      const a = this.vertices[i];
      const b = this.vertices[(i + 1) % this.vertices.length];
      
      const n = a.sub(b).cross_up(1).normalize();
      const d = a.dot(n);
      
      this.planes.push(new plane_t(n, d));
    }
  }
  
  move(v)
  {
    this.pos.x += v.x;
    this.pos.y += v.y;
    
    this.vertices = this.vertices.map((vertex) => {
      return vertex.add(v);
    });
    
    this.make_planes();
  }
  
  rotate(t)
  {
    this.vertices = this.vertices.map((vertex) => {
      return vertex.sub(this.pos).rotate(t).add(this.pos);
    });
    
    this.make_planes();
  }
  
  draw(pos, rot)
  {
    for (let i = 0; i < this.vertices.length; i++) {
      const p1 = this.vertices[i];
      const p2 = this.vertices[(i + 1) % this.vertices.length];
      
      const n = p1.sub(p2).cross_up(1).normalize().mulf(0.02);
      const m = p1.add(p2).mulf(0.5);
      
      pen.line(m, m.add(n));
      pen.line(p1, p2);
    }
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

class point_constraint_t {
  constructor(body, point)
  {
    this.body = body;
    this.point = point;
  }
  
  solve(beta)
  {
    const T = matrix_from([ [ this.body.pos.x, this.body.pos.y ] ]).transpose();
    const dT = matrix_from([ [ this.body.vel.x, this.body.vel.y ] ]).transpose();
    
    const M = matrix_from([
      [1, 0],
      [0, 1],
    ]);
    
    const C_x = {
      get: (Cx_T) => {
        return Cx_T.get(0, 0) - this.point.x;
      }
    };
    
    const C_y = {
      get: (Cy_T) => {
        return Cy_T.get(1, 0) - this.point.y;
      }
    };
    
    const [Jt, lambda] = solve([ C_x, C_y ], M, T, dT, beta);
    
    const F = Jt.mul(lambda);
    
    this.body.vel.x += F.get(0, 0);
    this.body.vel.y += F.get(1, 0);
  }
};

class contact_constraint_t {
  constructor(a, b, contact)
  {
    this.a = a;
    this.b = b;
    this.contact = contact;
    this.r1 = contact.p1.sub(a.pos);
    this.r2 = contact.p2.sub(b.pos);
    this.tangent1 = a.vel.add(contact.normal.mulf(-a.vel.dot(contact.normal))).normalize();
    this.tangent2 = b.vel.add(contact.normal.mulf(-b.vel.dot(contact.normal))).normalize();
    this.impulse = 0.0;
    this.tangent_impulse1 = 0.0;
    this.tangent_impulse2 = 0.0;
    this.mu = 0.5;
  }
  
  get(T)
  {
    const pos1 = new vec2_t(T.get(0, 0), T.get(1, 0));
    const rot1 = T.get(2, 0);
    const p1 = pos1.add(this.r1.rotate(rot1));
    
    const pos2 = new vec2_t(T.get(3, 0), T.get(4, 0));
    const rot2 = T.get(5, 0);
    const p2 = pos2.add(this.r2.rotate(rot2));
    
    return p1.dot(this.contact.normal) - p2.dot(this.contact.normal);
  }
  
  solve_friction1(beta)
  {
    const T = matrix_from([ [ 0.0, 0.0, 0.0 ] ]).transpose();
    const dT = matrix_from([ [ this.a.vel.x, this.a.vel.y, this.a.ang ] ]).transpose();
    
    const C_f = {
      get: (Cf_T) => {
        const shift = new vec2_t(T.get(0, 0), T.get(1, 0));
        const rot = T.get(2, 0);
        const p1 = shift.add(this.r1.rotate(rot));
        
        return p1.dot(this.tangent1);
      }
    };
    
    if (this.tangent1.dot(this.tangent1) < 0.00001) {
      return;
    }
    
    const I = 0.01;
    
    const M = matrix_from([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1/I]
    ]);
    
    const [Jt, lambda] = solve([ C_f ], M, T, dT, beta);
    const delta = lambda.get(0, 0);
    
    const old_impulse = this.tangent_impulse1;
    this.tangent_impulse1 += delta;
    this.tangent_impulse1 = clamp(this.tangent_impulse1, -this.impulse * this.mu, this.impulse * this.mu);
    lambda.set(0, 0, this.tangent_impulse1 - old_impulse);
    
    const F = Jt.mul(lambda);
    
    this.a.vel.x += F.get(0, 0);
    this.a.vel.y += F.get(1, 0);
    this.a.ang += F.get(2, 0) / I;
  }
  
  solve_friction2(beta)
  {
    const T = matrix_from([ [ 0.0, 0.0, 0.0 ] ]).transpose();
    const dT = matrix_from([ [ this.b.vel.x, this.b.vel.y, this.b.ang ] ]).transpose();
    
    const C_f = {
      get: (Cf_T) => {
        const shift = new vec2_t(T.get(0, 0), T.get(1, 0));
        const rot = T.get(2, 0);
        const p1 = shift.add(this.r2.rotate(rot));
        
        return p1.dot(this.tangent2);
      }
    };
    
    if (this.tangent2.dot(this.tangent2) < 0.00001) {
      return;
    }
    
    const I = 0.01;
    
    const M = matrix_from([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1/I]
    ]);
    
    const [Jt, lambda] = solve([ C_f ], M, T, dT, beta);
    const delta = lambda.get(0, 0);
    
    const old_impulse = this.tangent_impulse2;
    this.tangent_impulse2 += delta;
    this.tangent_impulse2 = clamp(this.tangent_impulse2, -this.impulse * this.mu, this.impulse * this.mu);
    lambda.set(0, 0, this.tangent_impulse2 - old_impulse);
    
    const F = Jt.mul(lambda);
    
    this.b.vel.x += F.get(0, 0);
    this.b.vel.y += F.get(1, 0);
    this.b.ang += F.get(2, 0) / I;
  }
  
  solve(beta)
  {
    const T = matrix_from([ [ this.a.pos.x, this.a.pos.y, 0.0, this.b.pos.x, this.b.pos.y, 0.0 ] ]).transpose();
    const dT = matrix_from([ [ this.a.vel.x, this.a.vel.y, this.a.ang, this.b.vel.x, this.b.vel.y, this.b.ang ] ]).transpose();
    
    const I = 0.01;
    
    const M = matrix_from([
      [1, 0, 0,   0, 0, 0  ],
      [0, 1, 0,   0, 0, 0  ],
      [0, 0, 1/I, 0, 0, 0  ],
      [0, 0, 0,   1, 0, 0  ],
      [0, 0, 0,   0, 1, 0  ],
      [0, 0, 0,   0, 0, 1/I],
    ]);
    
    const [Jt, lambda] = solve([ this ], M, T, dT, beta);
    const delta = lambda.get(0, 0);
    
    const old_impulse = this.impulse;
    this.impulse += delta;
    this.impulse = Math.max(0, this.impulse);
    lambda.set(0, 0, this.impulse - old_impulse);
    
    const F = Jt.mul(lambda);
    
    this.a.vel.x += F.get(0, 0);
    this.a.vel.y += F.get(1, 0);
    this.a.ang += F.get(2, 0) / I;
    
    this.b.vel.x += F.get(3, 0);
    this.b.vel.y += F.get(4, 0);
    this.b.ang += F.get(5, 0) / I;
    
    this.solve_friction1(0.0001);
    this.solve_friction2(0.0001);
  }
};

class static_contact_constraint_t {
  constructor(body, contact)
  {
    this.body = body;
    this.contact = contact;
    this.r1 = contact.p1.sub(body.pos);
    this.tangent = body.vel.add(contact.normal.mulf(-body.vel.dot(contact.normal))).normalize();
    this.impulse = 0.0;
  }
  
  get(T)
  {
    const pos = new vec2_t(T.get(0, 0), T.get(1, 0));
    const rot = T.get(2, 0);
    const p1 = pos.add(this.r1.rotate(rot));
    
    return p1.dot(this.contact.normal) - this.contact.p2.dot(this.contact.normal);
  }
  
  solve_friction(beta)
  {
    const T = matrix_from([ [ 0.0, 0.0, 0.0 ] ]).transpose();
    const dT = matrix_from([ [ this.body.vel.x, this.body.vel.y, this.body.ang ] ]).transpose();
    
    const C_f = {
      get: (Cf_T) => {
        const shift = new vec2_t(T.get(0, 0), T.get(1, 0));
        const rot = T.get(2, 0);
        const p1 = shift.add(this.r1.rotate(rot));
        
        return p1.dot(this.tangent);
      }
    };
    
    if (this.tangent.dot(this.tangent) < 0.001)
      return;
    
    const I = 0.01;
    
    const M = matrix_from([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1/I]
    ]);
    
    const [Jt, lambda] = solve([ C_f ], M, T, dT, beta);
    const delta = lambda.get(0, 0);
    
    const F = Jt.mul(lambda);
    
    this.body.vel.x += F.get(0, 0);
    this.body.vel.y += F.get(1, 0);
    this.body.ang += F.get(2, 0) / I;
  }
  
  solve(beta)
  {
    const T = matrix_from([ [ this.body.pos.x, this.body.pos.y, 0.0 ] ]).transpose();
    const dT = matrix_from([ [ this.body.vel.x, this.body.vel.y, this.body.ang ] ]).transpose();
    
    const I = 0.01;
    
    const M = matrix_from([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1/I]
    ]);
    
    const [Jt, lambda] = solve([ this ], M, T, dT, beta);
    const delta = lambda.get(0, 0);
    
    const old_impulse = this.impulse;
    this.impulse += delta;
    this.impulse = Math.max(0.01, this.impulse);
    lambda.set(0, 0, this.impulse - old_impulse);
    
    const F = Jt.mul(lambda);
    
    this.body.vel.x += F.get(0, 0);
    this.body.vel.y += F.get(1, 0);
    this.body.ang += F.get(2, 0) / I;
    
    this.solve_friction(0.0001);
  }
};

class contact_t {
  constructor(normal, p1, p2)
  {
    this.normal = normal;
    this.p1 = p1;
    this.p2 = p2;
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
  
  rotate(t)
  {
    this.rot += t;
    this.hull.rotate(t);
  }
  
  move(v)
  {
    this.pos = this.pos.add(v);
    this.hull.move(v);
  }
  
  check_point(point)
  {
    let min_depth = -100.0;
    let min_plane = null;
    let inside = true;
    
    for (const plane of this.hull.planes) {
      const depth = point.dot(plane.normal) - plane.distance;
      
      if (depth > 0.0) {
        inside = false;
        break;
      } else if (depth > min_depth){
        min_depth = depth;
        min_plane = plane;
      }
    }
    
    if (inside) {
      return min_plane;
    } else {
      return null;
    }
  }
  
  check_vertex(body, point)
  {
    let min_depth = -100.0;
    let min_plane = null;
    let inside = true;
    
    for (const plane of this.hull.planes) {
      const depth = point.dot(plane.normal) - plane.distance;
      
      if (depth > 0) {
        inside = false;
        break;
      } else {
        const max_depth = body.furthest_in(plane).dot(plane.normal) - plane.distance;
        
        if (max_depth > min_depth) {
          min_depth = max_depth;
          min_plane = plane;
        }
      }
    }
    
    if (inside) {
      return min_plane;
    } else {
      return null;
    }
  }
  
  furthest_in(plane)
  {
    let max_depth = 0.0;
    let max_vertex = null;
    
    for (const vertex of this.hull.vertices) {
      const depth = vertex.dot(plane.normal) - plane.distance;
      
      if (depth < max_depth) {
        max_depth = depth;
        max_vertex = vertex;
      }
    }
    
    return max_vertex;
  }
  
  clip_plane(plane)
  {
    const contacts = [];
    
    for (const vertex of this.hull.vertices) {
      const d = vertex.dot(plane.normal) - plane.distance;
      
      if (d < 0) {
        const p1 = vertex;
        const p2 = vertex.add(plane.normal.mulf(-plane.normal.dot(vertex) + plane.distance));
        contacts.push(new contact_t(plane.normal, p1, p2));
      }
    }
    
    return contacts;
  }
  
  clip_body(body)
  {
    const contacts = [];
    
    for (const vertex of body.hull.vertices) {
      const plane = this.check_vertex(body, vertex);
      
      if (plane) {
        const p1 = vertex.add(plane.normal.mulf(-plane.normal.dot(vertex) + plane.distance));
        const p2 = vertex;
        
        contacts.push(new contact_t(plane.normal.mulf(-1), p1, p2)); 
      }
    }
    
    for (const vertex of this.hull.vertices) {
      const plane = body.check_vertex(this, vertex);
      
      if (plane) {
        const p1 = vertex;
        const p2 = vertex.add(plane.normal.mulf(-plane.normal.dot(vertex) + plane.distance));
        
        contacts.push(new contact_t(plane.normal, p1, p2)); 
      }
    }
    
    return contacts;
  }
  
  integrate()
  {
    this.old_pos = this.pos.copy();
    
    const delta_pos = this.vel.mulf(TIMESTEP);
    const delta_rot = this.ang * TIMESTEP;
    
    this.move(delta_pos);
    this.rotate(delta_rot);
  }
  
  back()
  {
    this.hull.move(this.old_pos.sub(this.pos));
    this.pos = this.old_pos;
  }
  
  draw()
  {
    this.hull.draw(this.pos, this.rot);
  }
};

const square = [
  new vec2_t(-0.08, -0.05),
  new vec2_t(-0.08, +0.05),
  new vec2_t(+0.08, +0.05),
  new vec2_t(+0.08, -0.05)
];

const bodies = Array.from({length: 9}, () => {
  let p = new vec2_t(0, 0.1);
  /*
  const random_hull = Array.from({length: 8}, () => {
    const old_p = p.copy();
    p = p.rotate(-Math.random());
    return old_p;
  });
  */
  
  const s = 1.0 + Math.random();
  
  const random_hull = square.map((v) => {
    return v.mulf(s)
  });
  
  
  const body = new body_t(new hull_t(random_hull));
  body.move(new vec2_t(Math.random(), Math.random()));
  
  return body;
});

const planes = [
  new plane_t(new vec2_t(0,1), -0.3),
  new plane_t(new vec2_t(1,0), -0.9),
  new plane_t(new vec2_t(-1,0), -0.9),
];

let selected = null;

function update()
{
  pen.clear();
  pen.begin();
  
  for (const body of bodies) {
    body.vel.y -= 0.1;
  }
  
  const C = [];
  
  if (input.get_mouse_down(0)) {
    if (!selected) {
      for (const body of bodies) {
        if (body.check_point(input.get_mouse_pos())) {
          selected = body;
        }
      }
    }
  } else {
    selected = null;
  }
  
  if (selected) {
    if (input.get_key(key.code("Q"))) {
      selected.ang += 0.1;
    }
    
    if (input.get_key(key.code("E"))) {
      selected.ang -= 0.1;
    }
    
    C.push(new point_constraint_t(selected, input.get_mouse_pos()));
  }
  
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const contacts = bodies[i].clip_body(bodies[j]);
      
      for (const contact of contacts) {
        C.push(new contact_constraint_t(bodies[i], bodies[j], contact));
      }
    }
  }
  
  for (const body of bodies) {
    for (const plane of planes) {
      const contacts = body.clip_plane(plane);
      
      for (const contact of contacts) {
        C.push(new static_contact_constraint_t(body, contact));
      }
    }
  }
  
  for (let i = 0; i < 10; i++) {
    for (const c of C) {
      c.solve(0.25);
    }
  }
  
  for (const body of bodies) {
    body.integrate();
  }
  
  for (const body of bodies) {
    body.draw();
  }
  
  
  for (const plane of planes) {
    plane.draw();
  }
  
  pen.stroke();
}

function solve(C, M, T, dT, beta)
{
  const J = J_calc(C, T);
  const Jt = J.transpose();
  const Jv = J.mul(dT);
  const J_M_Jt = J.mul(M).mul(Jt);
  
  const bias = matrix_from(C.map((C_i) => [beta / TIMESTEP * C_i.get(T)]));
  const lambda = J_M_Jt.inverse().mul(Jv.add(bias).mulf(-1));
  
  return [Jt, lambda];
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
