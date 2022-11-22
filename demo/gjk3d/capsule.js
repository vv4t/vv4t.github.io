"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { obj_load } from "../misuzu/obj.js";

const canvas = document.getElementById("canvas");
const pen = new pen_t(canvas);
const input = new input_t(canvas);

const TIMESTEP = 0.015;
const RADIUS = 0.1;
const HEIGHT = 0.3;

class simplex_t {
  constructor()
  {
    this.vertices = [];
  }
  
  add(vertex)
  {
    this.vertices.unshift(vertex);
  }
  
  insert(vertex, i)
  {
    this.vertices.splice(i, 0, vertex);
  }
};

function furthest_in(vertices, dir)
{
  let max_d = -1000;
  let max_v;
  
  for (const vertex of vertices) {
    const d = vertex.dot(dir);
    if (d > max_d) {
      max_d = d;
      max_v = vertex;
    }
  }
  
  return max_v;
}

class edge_t {
  constructor()
  {
    this.distance = 10000.0;
    this.normal = new vec2_t();
    this.index = 0;
  }
};

function find_closest_edge(simplex)
{
  const closest = new edge_t();
  
  for (let i = 0; i < simplex.vertices.length; i++) {
    const j = (i + 1) % simplex.vertices.length;
    const a = simplex.vertices[i];
    const b = simplex.vertices[j];
    
    const e = b.sub(a);
    
    const n = e.cross_up(a.cross(e)).normalize();
    
    const d = n.dot(a);
    
    if (d < closest.distance) {
      closest.distance = d;
      closest.normal = n;
      closest.index = j;
    }
  }
  
  return closest;
}

function support(hull_a, hull_b, dir)
{
  const v_a = furthest_in(hull_a, dir).add(dir.normalize().mulf(RADIUS));
  const v_b = furthest_in(hull_b, dir.mulf(-1));
  
  return v_a.sub(v_b);
}

class capsule_t {
  constructor(pos)
  {
    this.pos = pos;
    this.dir = new vec2_t(0, 0.4).rotate(-0.7);
  }
  
  clip(hull, dir)
  {
    let is_clip = true;
    let min_face;
    let min_depth = -1000;
    
    let normal;
    let depth;    
    
    const p_aa = this.pos;
    const p_ba = this.pos.add(this.dir);
    
    const p_ab = p_aa.add(new vec2_t(0, HEIGHT));
    const p_bb = p_ba.add(new vec2_t(0, HEIGHT));
    
    for (let i = 0; i < hull.face_count(); i++) {
      const face = hull.get_face(i);
      
      const d_aa = p_aa.dot(face.normal) - face.distance - RADIUS;
      const d_ab = p_ab.dot(face.normal) - face.distance - RADIUS;
      
      const d_ba = p_ba.dot(face.normal) - face.distance - RADIUS;
      const d_bb = p_bb.dot(face.normal) - face.distance - RADIUS;
      
      const d_a = Math.min(d_aa, d_ab);
      const d_b = Math.min(d_ba, d_bb);
      
      const d = Math.min(d_a, d_b);
      
      if (d > min_depth) {
        min_depth = d;
        min_face = face;
      }
      
      if (d > 0)
        is_clip = false;
    }
    
    if (is_clip) {
      normal = min_face.normal;
      is_clip = false;
      
      const this_vertices = [
        p_aa, p_ab, p_bb, p_ba
      ];
      
      let d = hull.vertices[0].sub(this.pos);
      
      const simplex = new simplex_t();
      simplex.add(support(this_vertices, min_face.vertices, d.mulf(-1)));
      
      for (let i = 0; i < 10; i++) {
        simplex.add(support(this_vertices, min_face.vertices, d));
        
        if (simplex.vertices[0].dot(d) <= 0)
          break;
        
        const ao = simplex.vertices[0].mulf(-1);
        
        if (simplex.vertices.length == 2) {
          const ab = simplex.vertices[1].sub(simplex.vertices[0]);
          d = ab.cross_up(ao.cross(ab));
        } else if (simplex.vertices.length == 3) {
          const ab = simplex.vertices[1].sub(simplex.vertices[0]);
          const ac = simplex.vertices[2].sub(simplex.vertices[0]);
          
          const ab_perp = ab.cross_up(ab.cross(ac));
          const ac_perp = ac.cross_up(ac.cross(ab));
          
          if (ab_perp.dot(ao) >= 0) {
            d = ab_perp;
            simplex.vertices.splice(2, 1);
          } else {
            if (ac_perp.dot(ao) >= 0) {
              d = ac_perp;
              simplex.vertices.splice(1, 1);
            } else {
              is_clip = true;
              break;
            }
          }
        }
      }
    
      if (is_clip) {
        while (true) {
          const e = find_closest_edge(simplex);
          const p = support(this_vertices, min_face.vertices, e.normal);
          
          const d = p.dot(e.normal);
          if (d - e.distance < 0.0001) {
            normal = e.normal;
            min_depth = d;
            break;
          } else {
            simplex.insert(p, e.index);
          }
        }
      }
      
      pen.line(p_aa, p_ab);
      pen.line(p_ab, p_bb);
      pen.line(p_bb, p_ba);
      pen.line(p_ba, p_aa);
    }
    
    if (is_clip) {
      const p = this.pos.add(this.dir);
      pen.line(p, p.add(normal.mulf(-min_depth)));
    }
    
    return is_clip;
  }
  
  draw()
  {
    const p_aa = this.pos;
    const p_ba = this.pos.add(this.dir);
    
    const p_ab = p_aa.add(new vec2_t(0, HEIGHT));
    const p_bb = p_ba.add(new vec2_t(0, HEIGHT));
    
    const d = this.dir.normalize().cross_up(RADIUS);
    
    pen.line(p_aa.add(d), p_ba.add(d));
    pen.line(p_ab.sub(d), p_bb.sub(d));
    
    pen.circle(p_aa, RADIUS);
    pen.circle(p_ab, RADIUS);
    pen.line(p_aa.sub(new vec2_t(RADIUS, 0)), p_ab.sub(new vec2_t(RADIUS, 0)));
    pen.line(p_aa.add(new vec2_t(RADIUS, 0)), p_ab.add(new vec2_t(RADIUS, 0)));
    
    pen.circle(p_ba, RADIUS);
    pen.circle(p_bb, RADIUS);
    pen.line(p_ba.sub(new vec2_t(RADIUS, 0)), p_bb.sub(new vec2_t(RADIUS, 0)));
    pen.line(p_ba.add(new vec2_t(RADIUS, 0)), p_bb.add(new vec2_t(RADIUS, 0)));
  }
};

class face_t {
  constructor(normal, distance, vertices)
  {
    this.normal = normal;
    this.distance = distance;
    this.vertices = vertices;
  }
  
  draw()
  {
    const p = this.normal.mulf(this.distance);
    const tangent = this.normal.cross_up(4.0);
    const a = p.sub(tangent);
    const b = p.add(tangent);
    pen.line(a, b);
    pen.circle(p, 0.01);
    pen.line(p, p.add(this.normal.mulf(0.1)));
  }
};

class hull_t {
  constructor(vertices)
  {
    this.vertices = vertices;
    this.pos = new vec2_t();
    this.faces = [];
    this.gen_faces();
  }
  
  vertex_count()
  {
    return this.vertices.length;
  }
  
  face_count()
  {
    return this.faces.length;
  }
  
  get_vertex(i)
  {
    return this.vertices[i].add(this.pos);
  }
  
  get_face(i)
  {
    return new face_t(this.faces[i].normal, this.faces[i].distance + this.pos.dot(this.faces[i].normal), this.faces[i].vertices);
  }
  
  gen_faces()
  {
    for (let i = 0; i < this.vertices.length; i++) {
      const j = (i + 1) % this.vertices.length;
      
      const a = this.vertices[i];
      const b = this.vertices[j];
      
      const vertices = [ a, b ];
      
      const ab = b.sub(a);
      
      const n = ab.cross_up(1.0).normalize();
      const d = a.dot(n);
      
      this.faces.push(new face_t(n, d, vertices));
    }
    /*
    for (let i = 0; i < this.vertices.length; i++) {
      const j = (i + 1) % this.vertices.length;
      const k = (i + 2) % this.vertices.length;
      
      const b = this.vertices[i];
      const a = this.vertices[j];
      const c = this.vertices[k];
      
      const ba = a.sub(b);
      const ca = a.sub(c);
      
      const n = ba.add(ca).normalize();
      const d = n.dot(a);
      
      this.faces.push(new face_t(n, d));
    }*/
  }
  
  draw()
  {
    for (let i = 0; i < this.vertex_count(); i++)
      pen.circle(this.get_vertex(i), 0.01);
    
    for (let i = 0; i < this.face_count(); i++)
      this.get_face(i).draw();
  }
};

const hull = new hull_t([
  new vec2_t(-0.5, +0.25),
  new vec2_t(-0.5, -0.25),
  new vec2_t(+0.5, -0.25)
]);

const capsule = new capsule_t(new vec2_t());

function update()
{
  if (input.get_mouse_down())
    capsule.pos = input.get_mouse_pos();
  
  pen.clear();
  
  pen.begin();
  pen.circle(new vec2_t(), 0.02);
  pen.color("black");
  hull.draw();
  pen.stroke();
  
  pen.begin();
  if (capsule.clip(hull, capsule.dir))
    pen.color("red");
  else
    pen.color("green");
  capsule.draw();
  pen.stroke();
}

setInterval(() => update(), TIMESTEP * 1000);
