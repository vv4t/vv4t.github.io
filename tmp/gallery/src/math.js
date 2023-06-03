export function deg2rad(deg)
{
  return deg * Math.PI / 180.0;
}

export function rad2deg(rad)
{
  return rad * 180.0 / Math.PI;
}

export function normalize_angle(angle)
{
  return Math.atan2(Math.cos(angle), Math.sin(angle));
}

export class vec3_t
{
  static zero = new vec3_t(0.0, 0.0, 0.0);
  static up = new vec3_t(0.0, 1.0, 0.0);
  static right = new vec3_t(1.0, 0.0, 0.0);
  static forward = new vec3_t(0.0, 0.0, 1.0);
  
  constructor(x, y, z)
    {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  add(v)
  {
    return new vec3_t(this.x + v.x, this.y + v.y, this.z + v.z);
  };
  
  mul(v)
  {
    return new vec3_t(this.x * v.x, this.y * v.y, this.z * v.z);
  };
  
  mulf(v)
  {
    return new vec3_t(this.x * v, this.y * v, this.z * v);
  };
  
  dot(v)
  {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  };
  
  length()
  {
    return Math.sqrt(this.dot(this));
  };
  
  y_rotate(theta)
  {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    
    return new vec3_t(cos * this.x - sin * this.z, this.y, sin * this.x + cos * this.z);
  }
}

export class mat4_t
{
  constructor()
  {
    this.m = new Float32Array(16);
  }
  
  init_identity() {
    this.m[0] = 1; this.m[4] = 0; this.m[8]  = 0; this.m[12] = 0;
    this.m[1] = 0; this.m[5] = 1; this.m[9]  = 0; this.m[13] = 0;
    this.m[2] = 0; this.m[6] = 0; this.m[10] = 1; this.m[14] = 0;
    this.m[3] = 0; this.m[7] = 0; this.m[11] = 0; this.m[15] = 1;
    
    return this;
  };
  
  init_translation(v) {
    this.m[0] = 1; this.m[4] = 0; this.m[8]  = 0; this.m[12] = v.x;
    this.m[1] = 0; this.m[5] = 1; this.m[9]  = 0; this.m[13] = v.y;
    this.m[2] = 0; this.m[6] = 0; this.m[10] = 1; this.m[14] = v.z;
    this.m[3] = 0; this.m[7] = 0; this.m[11] = 0; this.m[15] = 1;
    
    return this;
  };
  
  init_perspective(aspect_ratio, fov, near, far) {
    const tan_fov = 1 / Math.tan(fov / 2);
    const ar_tan_fov = aspect_ratio * tan_fov;
    
    const z_scale = (-near - far) / (near - far);
    const z_offset = (2 * far * near) / (near - far);
    
    this.m[0] = ar_tan_fov; this.m[4] = 0;        this.m[8]  = 0;       this.m[12] = 0;
    this.m[1] = 0;          this.m[5] = tan_fov;  this.m[9]  = 0;       this.m[13] = 0;
    this.m[2] = 0;          this.m[6] = 0;        this.m[10] = z_scale; this.m[14] = z_offset;
    this.m[3] = 0;          this.m[7] = 0;        this.m[11] = 1;       this.m[15] = 0;
    
    return this;
  };
  
  init_y_rotation(theta) {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    
    this.m[0] = cos;  this.m[4] = 0; this.m[8]  = -sin; this.m[12] = 0;
    this.m[1] = 0;    this.m[5] = 1; this.m[9]  =  0;   this.m[13] = 0;
    this.m[2] = sin;  this.m[6] = 0; this.m[10] = +cos; this.m[14] = 0;
    this.m[3] = 0;    this.m[7] = 0; this.m[11] =  0;   this.m[15] = 1;
    
    return this;
  };
  
  mul(m) {
    const r = new mat4_t();
    
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        r.m[i * 4 + j] =  m.m[0 * 4 + j] * this.m[i * 4 + 0] +
                          m.m[1 * 4 + j] * this.m[i * 4 + 1] +
                          m.m[2 * 4 + j] * this.m[i * 4 + 2] +
                          m.m[3 * 4 + j] * this.m[i * 4 + 3];
                      
      }
    }
    
    return r;
  };
}
