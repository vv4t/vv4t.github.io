"use strict";

import { input } from "./input.js";
import { plane_t, vec2_t, rand } from "./math.js";
import { draw } from "./draw.js";

const TIMESTEP = 0.015;

class clip_t {
  constructor(normal, r1, r2)
  {
    this.normal = normal;
    this.r1 = r1;
    this.r2 = r2;
  }
};

class motion_t {
  constructor(mass)
  {
    this.mass = mass;
    this.vel = new vec2_t();
    this.ang_vel = 0.0;
  }
};

class shape_t {
  constructor(pos, rot, vertices)
  {
    this.pos = pos;
    this.rot = rot;
    this.vertices = [];
    this.planes = [];
    
    for (const vertex of vertices) {
      this.vertices.push(vec2_t.add(this.pos, vec2_t.rotate(vertex, rot)));
    }
    
    for (let i = 0; i < this.vertices.length; i++) {
      const a = this.vertices[i];
      const b = this.vertices[(i + 1) % this.vertices.length];
      
      const tangent = vec2_t.sub(b, a);
      const normal = vec2_t.normalize(vec2_t.cross_up(tangent));
      const distance = vec2_t.dot(a, normal);
      
      this.planes.push(new plane_t(normal, distance));
    }
  }
  
  translate(d_pos)
  {
    this.pos = vec2_t.add(this.pos, d_pos);
    
    for (let i = 0; i < this.vertices.length; i++)
      this.vertices[i] = vec2_t.add(this.vertices[i], d_pos);
    
    for (const plane of this.planes)
      plane.distance += vec2_t.dot(plane.normal, d_pos);
  }
  
  rotate(d_rot)
  {
    this.rot += d_rot;
    
    for (let i = 0; i < this.vertices.length; i++) {
      const arm = vec2_t.rotate(vec2_t.sub(this.vertices[i], this.pos), d_rot);
      this.vertices[i] = vec2_t.add(this.pos, arm);
    }
    
    this.planes = [];
    
    for (let i = 0; i < this.vertices.length; i++) {
      const a = this.vertices[i];
      const b = this.vertices[(i + 1) % this.vertices.length];
      
      const tangent = vec2_t.sub(b, a);
      const normal = vec2_t.normalize(vec2_t.cross_up(tangent));
      const distance = vec2_t.dot(a, normal);
      
      this.planes.push(new plane_t(normal, distance));
    }
  }
};

function draw_shape(shape)
{
  for (let i = 0; i < shape.vertices.length; i++) {
    const a = shape.vertices[i];
    const b = shape.vertices[(i + 1) % shape.vertices.length];
    
    draw.line(a, b);
  }
}


function clip_shape_plane(shape, plane)
{
  let min_dist = 100;
  let min_vertex;
  
  for (const vertex of shape.vertices) {
    const dist = vec2_t.dot(vertex, plane.normal) - plane.distance;
    if (dist < min_dist) {
      min_dist = dist;
      min_vertex = vertex;
    }
  }
  
  if (min_dist > 0)
    return null;
  
  const projection = vec2_t.dot(min_vertex, plane.normal) - plane.distance;
  
  const r1 = min_vertex;
  const r2 = vec2_t.add(min_vertex, vec2_t.mulf(plane.normal, -projection));
  
  return new clip_t(plane.normal, r1, r2);
}

function clip_shape_shape(a, b)
{
  let max_plane = null;
  let max_dist = -100;
  let max_vertex;
  let swap = false;
  
  for (const plane of a.planes) {
    let min_dist = 100;
    let min_vertex;
    
    for (const vertex of b.vertices) {
      const dist = vec2_t.dot(vertex, plane.normal) - plane.distance;
      if (dist < min_dist) {
        min_dist = dist;
        min_vertex = vertex;
      }
    }
    
    if (min_dist < 0) {
      if (min_dist > max_dist) {
        max_dist = min_dist;
        max_vertex = min_vertex;
        max_plane = plane;
      }
    } else {
      return null;
    }
  }
  
  for (const plane of b.planes) {
    let min_dist = 0;
    let min_vertex;
    
    for (const vertex of a.vertices) {
      const dist = vec2_t.dot(vertex, plane.normal) - plane.distance;
      
      if (dist < min_dist) {
        min_dist = dist;
        min_vertex = vertex;
      }
    }
    
    if (min_dist < 0) {
      if (min_dist > max_dist) {
        swap = true;
        max_dist = min_dist;
        max_vertex = min_vertex;
        max_plane = new plane_t(vec2_t.mulf(plane.normal, -1), -plane.distance);
      }
    } else {
      return null;
    }
  }
  
  const projection = vec2_t.dot(max_vertex, max_plane.normal) - max_plane.distance;
  
  let r2 = max_vertex;
  let r1 = vec2_t.add(max_vertex, vec2_t.mulf(max_plane.normal, -projection));
  
  if (swap) {
    const tmp = r1;
    r1 = r2;
    r2 = tmp;
  }
  
  return new clip_t(max_plane.normal, r1, r2);
}

class constraint_t {
  constructor(a, b, l)
  {
    this.a = a;
    this.b = b;
    this.l = l;
  }
};

const h = 10;
const dt = TIMESTEP / h;

export class scene_phys_t {
  shape;
  motion;
  planes;
  constraints;
  static_constraints;
  selected_shape;
  shape_a;
  next_select;
  num_entities;
  
  load()
  {
    this.shape = {};
    this.motion = {};
    this.planes = [];
    this.constraints = [];
    this.static_constraints = [];
    this.selected_shape = -1;
    this.shape_a = -1;
    this.next_select = true;
    this.num_entities = 0;
    
    this.planes.push(new plane_t(new vec2_t(+1, 0), -30));
    this.planes.push(new plane_t(new vec2_t(0, +1), -30));
    this.planes.push(new plane_t(new vec2_t(-1, 0), -30));
    this.planes.push(new plane_t(new vec2_t(0, -1), -30));
    
    const square_vertices = [
      new vec2_t(-1, +1),
      new vec2_t(+1, +1),
      new vec2_t(+1, -1),
      new vec2_t(-1, -1)
    ];
    
    this.spawn_rect();
    this.spawn_boxes();
    // this.static_constraints.push(new constraint_t(0, new vec2_t(), 10));
  }
  
  spawn_rect()
  {
    const rect_vertices = [
      new vec2_t(-6, +1),
      new vec2_t(+6, +1),
      new vec2_t(+6, -1),
      new vec2_t(-6, -1)
    ];
    
    const rect = this.add_entity();
    this.motion[rect] = new motion_t(1.0);
    this.shape[rect] = new shape_t(new vec2_t(0, 0), 0.0, rect_vertices);
  }
  
  spawn_boxes()
  {
    const square_vertices = [
      new vec2_t(-1, +1),
      new vec2_t(+1, +1),
      new vec2_t(+1, -1),
      new vec2_t(-1, -1)
    ];
    
    const range = 40;
    for (let i = 0; i < 50; i++) {
      const box = this.add_entity();
      this.motion[box] = new motion_t(1.0);
      this.shape[box] = new shape_t(new vec2_t(rand() * range, rand() * range), 0.0, square_vertices);
    }
  }
  
  frame()
  {
    draw.clear();
    
    if (input.get_mouse_button() && this.selected_shape == -1) {
      this.selected_shape = this.find_entity(input.get_mouse_pos());
    }
    
    if (input.get_key("C")) {
      const entity = this.find_entity(input.get_mouse_pos());
      
      for (let i = 0; i < this.static_constraints.length; i++) {
        if (this.static_constraints[i].a === entity)
          this.static_constraints.splice(i, 1);
        
        if (entity == -1) {
          const dist = vec2_t.length(vec2_t.sub(input.get_mouse_pos(), this.static_constraints[i].b));
          if (dist < 1)
            this.static_constraints.splice(i, 1);
        }
      }
      
      for (let i = 0; i < this.constraints.length; i++) {
        if (this.constraints[i].a == entity
        || this.constraints[i].b == entity)
          this.constraints.splice(i, 1);
      }
    }
    
    if (input.get_key("X")) {
      if (this.next_select) {
        const entity = this.find_entity(input.get_mouse_pos());
        if (this.shape_a == -1) {
          this.shape_a = entity;
        } else if (this.shape_a != entity) {
          if (entity == -1) {
            this.static_constraints.push(new constraint_t(this.shape_a, input.get_mouse_pos(), 3));
            this.shape_a = -1;
          } else {
            this.constraints.push(new constraint_t(this.shape_a, entity, 3));
            this.shape_a = -1;
          }
        }
        
        this.next_select = false;
      }
    } else {
      this.next_select = true;
    }
    
    if (!input.get_mouse_button()) {
      this.selected_shape = -1;
    }
    
    for (let i = 0; i < h; i++) {
      this.follow_cursor();
      this.apply_gravity();
      this.apply_static_constraints();
      this.apply_constraints();
      // this.apply_test_constraint();
      this.clip_shape_plane();
      this.clip_shape_shape();
      this.integrate();
    }
    
    this.draw();
  }
  
  /*
  apply_test_constraint()
  {
    const i = 0;
    
    const p1 = this.shape[i].vertices[0];
    const p2 = new vec2_t(4, 0);
    
    const r = vec2_t.sub(this.shape[i].vertices[0], this.shape[i].pos);
    
    const delta_pos = vec2_t.sub(p1, p2);
    
    const m = 1.0 / this.motion[i].mass;
    const m_i = 1.0 / (vec2_t.length(r) * this.motion[i].mass);
    
    const jt_v = delta_pos;
    const jt_w = vec2_t.cross(r, vec2_t.add(delta_pos, r));
    
    const v = this.motion[i].vel;
    const w = this.motion[i].ang_vel;
    
    const b = 0.1 / dt * (vec2_t.length(delta_pos) - 4);
    const jv = vec2_t.dot(jt_v, v) + jt_w * w;
    const effective_mass = vec2_t.dot(jt_v, jt_v) * m + jt_w * jt_w * m_i;
    const lambda = -(jv + b) / effective_mass;
    
    const dv = vec2_t.mulf(jt_v, lambda * m);
    const dw = jt_w * lambda * m_i;
    
    draw.circle(p1, 0.2);
    draw.circle(p2, 0.2);
    draw.line(p1, p2);
    
    this.motion[i].vel = vec2_t.add(this.motion[i].vel, dv);
    this.motion[i].ang_vel += dw;
  }*/
  
  find_entity(pos)
  {
    for (let i = 0; i < this.num_entities; i++) {
      if (!(i in this.motion) && !(i in this.shape))
        continue;
      
      const dist = vec2_t.length(vec2_t.sub(pos, this.shape[i].pos));
      
      if (dist < 1.0)
        return i;
    }
    
    return -1;
  }
  
  apply_constraints()
  {
    for (const c of this.constraints) {
      const delta_pos = vec2_t.sub(this.shape[c.a].pos, this.shape[c.b].pos);
      
      const m_a = 1.0 / this.motion[c.a].mass;
      const m_b = 1.0 / this.motion[c.b].mass;
      
      const jt_va = delta_pos;
      const jt_vb = vec2_t.mulf(delta_pos, -1);
      
      const v_a = this.motion[c.a].vel;
      const v_b = this.motion[c.b].vel;
      
      const b = 0.1 / dt * (vec2_t.length(delta_pos) - c.l);
      const jv = vec2_t.dot(jt_va, v_a) + vec2_t.dot(jt_vb, v_b);
      const effective_mass = vec2_t.dot(jt_va, jt_va) * m_a + vec2_t.dot(jt_vb, jt_vb) * m_b;
      const lambda = -(jv + b) / effective_mass;
      
      const dv_a = vec2_t.mulf(jt_va, lambda * m_a);
      const dv_b = vec2_t.mulf(jt_vb, lambda * m_b);
      
      this.motion[c.a].vel = vec2_t.add(this.motion[c.a].vel, dv_a);
      this.motion[c.b].vel = vec2_t.add(this.motion[c.b].vel, dv_b);
    }
  }
  
  apply_static_constraints()
  {
    for (const c of this.static_constraints) {
      const delta_pos = vec2_t.sub(this.shape[c.a].pos, c.b);
      
      const m_a = 1.0 / this.motion[c.a].mass;
      
      const jt_va = delta_pos;
      const v_a = this.motion[c.a].vel;
      
      const b = 0.1 / dt * (vec2_t.length(delta_pos) - c.l);
      const jv = vec2_t.dot(jt_va, v_a);
      const effective_mass = vec2_t.dot(jt_va, jt_va) * m_a;
      const lambda = -(jv + b) / effective_mass;
      
      const dv_a = vec2_t.mulf(jt_va, lambda * m_a);
      
      this.motion[c.a].vel = vec2_t.add(this.motion[c.a].vel, dv_a);
    }
  }
  
  apply_gravity()
  {
    for (let i = 0; i < this.num_entities; i++) {
      if (!(i in this.motion))
        continue;
      
      this.motion[i].vel = vec2_t.add(this.motion[i].vel, new vec2_t(0, -98.0 * dt));
    }
  }
  
  follow_cursor()
  {
    if (this.selected_shape != -1) {
      const i = this.selected_shape;
      const j = vec2_t.sub(this.shape[i].pos, input.get_mouse_pos());
      
      const beta = 0.01 / dt;
      this.motion[i].vel = vec2_t.add(this.motion[i].vel, vec2_t.mulf(j, -beta));
      this.motion[i].vel = vec2_t.mulf(this.motion[i].vel, 0.8);
    }
    
  }
  
  integrate()
  {
    for (let i = 0; i < this.num_entities; i++) {
      if (!(i in this.motion) || !(i in this.shape))
        continue;
      
      const delta_pos = vec2_t.mulf(this.motion[i].vel, dt);
      const delta_rot = this.motion[i].ang_vel * dt;
      
      this.shape[i].translate(delta_pos);
      this.shape[i].rotate(delta_rot);
    }
  }
  
  clip_shape_plane()
  {
    for (let i = 0; i < this.num_entities; i++) {
      if (!(i in this.shape) && !(i in this.motion))
        continue;
      
      for (const plane of this.planes) {
        const clip = clip_shape_plane(this.shape[i], plane);
        
        if (!clip)
          continue;
        
        const r = vec2_t.sub(clip.r1, this.shape[i].pos);
        
        const jt_v = clip.normal;
        const jt_w = vec2_t.cross(r, clip.normal);
        
        const v = this.motion[i].vel;
        const w = this.motion[i].ang_vel;
        
        const m = 1.0 / this.motion[i].mass;
        const m_i = 1.0 / (vec2_t.length(r) * this.motion[i].mass);
        
        const c = vec2_t.dot(vec2_t.sub(clip.r1, clip.r2), clip.normal);
        
        const b = 0.05 / dt * c;
        const jv = vec2_t.dot(jt_v, v) + jt_w * w;
        const effective_mass = vec2_t.dot(jt_v, jt_v) + jt_w * jt_w * m_i;
        
        const lambda = -(jv + b) / effective_mass;
        
        if (lambda > 0) {
          const dv = vec2_t.mulf(jt_v, lambda * m);
          const dw = jt_w * lambda * m_i;
          
          this.motion[i].vel = vec2_t.add(this.motion[i].vel, dv);
          this.motion[i].ang_vel += dw;
        }
      }
    }
  }
  
  clip_shape_shape()
  {
    for (let i = 0; i < this.num_entities; i++) {
      if (!(i in this.shape) && !(i in this.motion))
        continue;
      
      for (let j = i + 1; j < this.num_entities; j++) {
        if (!(i in this.shape) && !(i in this.motion))
          continue;
        
        const clip = clip_shape_shape(this.shape[i], this.shape[j]);
        
        if (!clip)
          continue;
        
        const r1 = vec2_t.sub(clip.r1, this.shape[i].pos);
        const r2 = vec2_t.sub(clip.r2, this.shape[j].pos);
        
        const jt_va = clip.normal;
        const jt_wa = vec2_t.cross(r1, clip.normal);
        const jt_vb = vec2_t.mulf(clip.normal, -1);
        const jt_wb = -vec2_t.cross(r2, clip.normal);
        
        const m_a = 1.0 / this.motion[i].mass;
        const i_a = 1.0 / (vec2_t.length(r1) * this.motion[i].mass);
        const m_b = 1.0 / this.motion[j].mass;
        const i_b = 1.0 / (vec2_t.length(r2) * this.motion[j].mass);
        
        const v_a = vec2_t.add(this.motion[i].vel, vec2_t.mulf(vec2_t.cross_up(r1), this.motion[i].ang_vel));
        const w_a = this.motion[i].ang_vel;
        const v_b = vec2_t.add(this.motion[j].vel, vec2_t.mulf(vec2_t.cross_up(r2), this.motion[j].ang_vel));
        const w_b = this.motion[j].ang_vel;
        
        const c = vec2_t.dot(vec2_t.sub(clip.r1, clip.r2), clip.normal);
        
        const b = 0.1 / dt * c;
        const jv = vec2_t.dot(jt_va, v_a) + w_a * jt_wa + vec2_t.dot(jt_vb, v_b) + w_b * jt_wb;
        const effective_mass = vec2_t.dot(jt_va, jt_va) * m_a + jt_wa * jt_wa * i_a + vec2_t.dot(jt_vb, jt_vb) * m_b + jt_wb * jt_wb * i_b;
        
        const lambda = -(jv + b) / effective_mass;
        
        if (lambda < 0) {
          const dv_a = vec2_t.mulf(jt_va, lambda * m_a);
          const dw_a = jt_wa * lambda * i_a;
          const dv_b = vec2_t.mulf(jt_vb, lambda * m_b);
          const dw_b = jt_wb * lambda * i_b;
          
          this.motion[i].vel = vec2_t.add(this.motion[i].vel, dv_a);
          this.motion[i].ang_vel += dw_a;
          
          this.motion[j].vel = vec2_t.add(this.motion[j].vel, dv_b);
          this.motion[j].ang_vel += dw_b;
        }
      }
    }
  }
  
  draw()
  {
    if (this.shape_a != -1)
      draw.circle(this.shape[this.shape_a].pos, 0.2);
    
    for (let i = 0; i < this.num_entities; i++) {
      if (!(i in this.shape))
        continue;
      
      draw_shape(this.shape[i]);
    }
    
    for (const c of this.constraints)
      draw.line(this.shape[c.a].pos, this.shape[c.b].pos);
    
    for (const c of this.static_constraints)
      draw.line(this.shape[c.a].pos, c.b);
    
    for (const plane of this.planes)
      draw.plane(plane);
  }
  
  add_entity()
  {
    return this.num_entities++;
  }
};

function main()
{
  const scene_phys = new scene_phys_t();
  
  scene_phys.load();
  
  document.getElementById("reset").onclick = () => scene_phys.load();
  
  draw.color(255, 255, 255);
  
  setInterval(function() {
    scene_phys.frame();
  }, TIMESTEP * 1000);
}

main();
