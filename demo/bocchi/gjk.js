"use strict";

import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";

function cross_from(a, b, c)
{
  let ab = a.cross(b);
  return ab.mulf(-ab.dot(c));
}

class simplex_t {
  constructor()
  {
    this.vertices = [];
  }
  
  add(vertex)
  {
    this.vertices.unshift(vertex);
  }
  
  next_simplex(hull_a, hull_b)
  {
    let new_d;
    switch (this.vertices.length) {
    case 2:
      new_d = this.next_line();
      break;
    case 3:
      new_d = this.next_triangle();
      break;
    case 4:
      new_d = this.next_tetrahedron();
      break;
    }
    
    if (new_d)
      this.add(support(hull_a, hull_b, new_d));
    
    return new_d;
  }
  
  next_tetrahedron()
  {
    const ao = this.vertices[0].mulf(-1);
    
    const ab = this.vertices[1].sub(this.vertices[0]);
    const ac = this.vertices[2].sub(this.vertices[0]);
    const ad = this.vertices[3].sub(this.vertices[0]);
    
    const n_abc = cross_from(ab, ac, ad);
    const n_abd = cross_from(ab, ad, ac);
    const n_acd = cross_from(ac, ad, ab);
    
    if (n_abc.dot(ao) >= 0.0) {
      this.vertices.splice(3, 1);
      return n_abc;
    } else if (n_abd.dot(ao) >= 0.0) {
      this.vertices.splice(2, 1);
      return n_abd;
    } else if (n_acd.dot(ao) >= 0.0) {
      this.vertices.splice(1, 1);
      return n_acd;
    } else {
      return null;
    }
  }
  
  next_line()
  {
    const a = this.vertices[0];
    const b = this.vertices[1];
    
    const ab = this.vertices[1].sub(this.vertices[0]);
    const ao = a.mulf(-1);
    
    return ab.cross(ao).cross(ab);
  }
  
  next_triangle()
  {
    const a = this.vertices[0];
    const b = this.vertices[1];
    const c = this.vertices[2];
    
    const ab = b.sub(a);
    const ac = c.sub(a);
    
    return cross_from(ab, ac, a);
  }
  
  draw()
  {
    switch (this.vertices.length) {
    case 2:
      pen3d.line(this.vertices[0], this.vertices[1]);
      break;
    case 3:
      pen3d.line(this.vertices[0], this.vertices[1]);
      pen3d.line(this.vertices[1], this.vertices[2]);
      pen3d.line(this.vertices[2], this.vertices[0]);
      break;
    case 4:
      pen3d.line(this.vertices[0], this.vertices[1]);
      pen3d.line(this.vertices[1], this.vertices[2]);
      pen3d.line(this.vertices[2], this.vertices[0]);
      
      pen3d.line(this.vertices[0], this.vertices[3]);
      pen3d.line(this.vertices[1], this.vertices[3]);
      pen3d.line(this.vertices[2], this.vertices[3]);
      break;
    }
  }
};

class face_t {
  constructor(a, b, c, normal, distance)
  {
    this.a = a;
    this.b = b;
    this.c = c;
    this.normal = normal;
    this.distance = distance;
  }
};

class polytope_t {
  constructor(simplex)
  {
    this.vertices = [];
    this.faces = [];
    
    for (const vertex of simplex.vertices)
      this.vertices.push(vertex);
    
    this.add_simplex(0, 1, 2, 3, true);
  }
  
  expand(hull_a, hull_b)
  {
    let normal, depth;
    
    const z = parseInt(document.getElementById("z").value);
    for (let i = 0; i < z; i++) {
      const f_i = this.find_closest_face();
      const f = this.faces[f_i];
      const p = support(hull_a, hull_b, f.normal);
      const dot = p.dot(f.normal);
      
      if (dot - f.distance < 0.01) {
        return [ f.normal, dot ];
      } else {
        normal = f.normal;
        depth = f.distance;
        
        const d = this.vertices.length;
        this.vertices.push(p);
        
        this.faces.splice(f_i, 1);
        this.add_simplex(f.a, f.b, f.c, d, false);
      }
    }
    
    return [ normal, depth ];
  }
  
  add_simplex(a, b, c, d, do_abc)
  {
    const ab = this.vertices[b].sub(this.vertices[a]);
    const ac = this.vertices[c].sub(this.vertices[a]);
    const ad = this.vertices[d].sub(this.vertices[a]);
    
    const ba = this.vertices[a].sub(this.vertices[b]);
    const bc = this.vertices[c].sub(this.vertices[b]);
    const bd = this.vertices[d].sub(this.vertices[b]);
    
    const n_abc = cross_from(ab, ac, ad).normalize();
    const n_abd = cross_from(ab, ad, ac).normalize();
    const n_acd = cross_from(ac, ad, ab).normalize();
    const n_bcd = cross_from(bc, bd, ba).normalize();
    
    let do_abd = true, do_acd = true, do_bcd = true;
    for (let i = 0; i < this.faces.length; i++) {
      const d_abd = Math.abs(this.faces[i].distance + this.vertices[a].dot(n_abd));
      const d_acd = Math.abs(this.faces[i].distance + this.vertices[a].dot(n_acd));
      const d_bcd = Math.abs(this.faces[i].distance + this.vertices[b].dot(n_bcd));
      
      const Z = -0.999;
      
      if (this.faces[i].normal.dot(n_abd) <= Z && d_abd < 0.01) {
        do_abd = false;
        this.faces.splice(i, 1)
        if (i > 0)
          i--;
      }
      
      if (this.faces[i].normal.dot(n_acd) <= Z && d_acd < 0.01) {
        do_acd = false;
        this.faces.splice(i, 1);
        if (i > 0)
          i--;
      }
      
      if (this.faces[i].normal.dot(n_bcd) <= Z && d_bcd < 0.01) {
        do_bcd = false;
        this.faces.splice(i, 1);
        if (i > 0)
          i--;
      }
    }
    
    if (do_abc)
      this.faces.push(new face_t(a, b, c, n_abc, this.vertices[a].dot(n_abc)));
    if (do_abd)
      this.faces.push(new face_t(a, b, d, n_abd, this.vertices[a].dot(n_abd)));
    if (do_acd)
      this.faces.push(new face_t(a, c, d, n_acd, this.vertices[a].dot(n_acd)));
    if (do_bcd)
      this.faces.push(new face_t(b, c, d, n_bcd, this.vertices[b].dot(n_bcd)));
  }
  
  find_closest_face()
  {
    let min_face;
    let min_dist = 1000;
    
    for (let i = 0; i < this.faces.length; i++) {
      const d = this.faces[i].distance;
      
      if (d < min_dist && d > 0) {
        min_dist = d;
        min_face = i;
      }
    }
    
    return min_face;
  }
  
  draw()
  {
    for (const face of this.faces) {
      const a = this.vertices[face.a];
      const b = this.vertices[face.b];
      const c = this.vertices[face.c];
      
      pen3d.line(a, b);
      pen3d.line(b, c);
      pen3d.line(c, a);
      
      const p = a.add(b).add(c).mulf(0.33);
      
      pen3d.circle(p, 0.1);
      pen3d.line(p, p.add(face.normal));
    }
  }
};

export function clip_gjk(hull_a, hull_b)
{
  let d = hull_a.get_vertex(0).sub(hull_b.get_vertex(0));
  
  const simplex = new simplex_t();
  simplex.add(support(hull_a, hull_b, d.mulf(-1)));
  simplex.add(support(hull_a, hull_b, d));
  
  while (d) {
    if (simplex.vertices[0].dot(d) <= 0)
      return [null, null];
    
    d = simplex.next_simplex(hull_a, hull_b);
  }
  
  const polytope = new polytope_t(simplex);
  return polytope.expand(hull_a, hull_b);
}

function support(shape_a, shape_b, d)
{
  const a = shape_a.furthest_in(d);
  const b = shape_b.furthest_in(d.mulf(-1));
  
  return a.sub(b);
}

export class hull_t {
  constructor(vertices, radius)
  {
    this.vertices = vertices;
    this.radius = radius;
  }
  
  get_vertex(i)
  {
    return this.vertices[i];
  }
  
  vertex_count()
  {
    return this.vertices.length;
  }
  
  furthest_in(d)
  {
    let max_dot = d.dot(this.get_vertex(0));
    let max_vertex = 0;
    
    for (let i = 1; i < this.vertex_count(); i++) {
      let dot = d.dot(this.get_vertex(i));
      
      if (dot > max_dot) {
        max_dot = dot;
        max_vertex = i;
      }
    }
    
    return this.get_vertex(max_vertex).add(d.normalize().mulf(this.radius));
  }
};
