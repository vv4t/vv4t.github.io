"use strict"

export class vec2_t {
  constructor(x=0.0, y=0.0)
  {
    this.x = x;
    this.y = y;
  }
  
  add(v)
  {
    return new vec2_t(
      this.x + v.x,
      this.y + v.y
    );
  }
  
  mulf(f)
  {
    return new vec2_t(
      this.x * f,
      this.y * f
    );
  }

  mul(v) {
    return new vec2_t(
      this.x * v.x,
      this.y * v.y
    );
  }

  set(v) {
    this.x = v.x;
    this.y = v.y;
  }
}

export class vec3_t {
  constructor(x=0.0, y=0.0, z=0.0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  add(v) {
    return new vec3_t(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z
    );
  }
  
  mulf(f) {
    return new vec3_t(
      this.x * f,
      this.y * f,
      this.z * f
    );
  }
  
  set(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }

  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
}

export class vec4_t {
  constructor(x=0.0, y=0.0, z=0.0, w=1.0)
  {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  
  add(v)
  {
    return new vec4_t(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z,
      this.w + v.w
    );
  }
  
  mulf(f)
  {
    return new vec4_t(
      this.x * f,
      this.y * f,
      this.z * f,
      this.w
    );
  }
}

export class mat4_t {
  constructor(a,b,c,d) {
    const m = new Float32Array(4 * 4);
    if (a && b && c && d) {
      m[ 0] = a.x;  m[ 1] = a.y;  m[ 2] = a.z;  m[ 3] = a.w;
      m[ 4] = b.x;  m[ 5] = b.y;  m[ 6] = b.z;  m[ 7] = b.w;
      m[ 8] = c.x;  m[ 9] = c.y;  m[10] = c.z;  m[11] = c.w;
      m[12] = d.x;  m[13] = d.y;  m[14] = d.z;  m[15] = d.w;
    }
    this.m = m;
  }
  
  mul(b) {
    const r = new mat4_t();
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        r.m[i * 4 + j] = b.m[0 * 4 + j] * this.m[i * 4 + 0] +
                         b.m[1 * 4 + j] * this.m[i * 4 + 1] +
                         b.m[2 * 4 + j] * this.m[i * 4 + 2] +
                         b.m[3 * 4 + j] * this.m[i * 4 + 3];
                      
      }
    }
    
    return r;
  }
  
  static init_identity() {
    return new mat4_t(
      new vec4_t(1,0,0,0),
      new vec4_t(0,1,0,0),
      new vec4_t(0,0,1,0),
      new vec4_t(0,0,0,1)
    );
  }
  
  static init_translation(v) {
    return new mat4_t(
      new vec4_t(1,0,0,0),
      new vec4_t(0,1,0,0),
      new vec4_t(0,0,1,0),
      new vec4_t(v.x,v.y,v.z,1)
    );
  }
  
  static init_rotation(t) {
    const s = Math.cos(t);
    const c = Math.sin(t);
    
    return new mat4_t(
      new vec4_t(+c,-s,0,0),
      new vec4_t(+s,+c,0,0),
      new vec4_t(0,0,1,0),
      new vec4_t(0,0,0,1)
    );
  }
  
  static init_orthogonal(l, r, t, b, n, f) {
    const u = 2 / (r - l);
    const v = 2 / (t - b);
    const w = -2 / (f - n);
    const x = -(r + l) / (r - l);
    const y = -(t + b) / (t - b);
    const z = -(f + n) / (f - n);
    
    return new mat4_t(
      new vec4_t(u,0,0,0),
      new vec4_t(0,v,0,0),
      new vec4_t(0,0,w,0),
      new vec4_t(x,y,z,1)
    );
  }
}
