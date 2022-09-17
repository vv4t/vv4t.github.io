"use strict";

export function clamp(n, min, max)
{
  return Math.min(Math.max(n, min), max);
}

export class vec2_t {
  constructor(x = 0, y = 0)
  {
    this.x = x;
    this.y = y;
  }
  
  add(v)
  {
    return new vec2_t(
      this.x + v.x,
      this.y + v.y);
  }
  
  sub(v)
  {
    return new vec2_t(
      this.x - v.x,
      this.y - v.y);
  }
  
  mulf(v)
  {
    return new vec2_t(
      this.x * v,
      this.y * v);
  }
  
  rotate(theta)
  {
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    
    return new vec2_t(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos);
  }
  
  cross_up(v)
  {
    return new vec2_t(this.y * v, -this.x * v);
  }
};

export class vec3_t {
  constructor(x = 0, y = 0, z = 0)
  {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  add(v)
  {
    return new vec3_t(
      this.x + v.x,
      this.y + v.y,
      this.z + v.z);
  }
  
  sub(v)
  {
    return new vec3_t(
      this.x - v.x,
      this.y - v.y,
      this.z - v.z);
  }
  
  mulf(v)
  {
    return new vec3_t(
      this.x * v,
      this.y * v,
      this.z * v);
  }
  
  cross(v)
  {
    return new vec3_t(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x);
  }
  
  rotate_zyx(R)
  {
    return this.rotate_z(R.z).rotate_y(R.y).rotate_x(R.x);
  }
  
  rotate_zxy(R)
  {
    return this.rotate_z(R.z).rotate_x(R.x).rotate_y(R.y);
  }
  
  rotate_x(x)
  {
    const cos = Math.cos(x);
    const sin = Math.sin(x);
    
    return new vec3_t(
      this.x,
      this.y * cos - this.z * sin,
      this.y * sin + this.z * cos);
  }
  
  rotate_y(y)
  {
    const cos = Math.cos(y);
    const sin = Math.sin(y);
    
    return new vec3_t(
      this.x * cos - this.z * sin,
      this.y,
      this.x * sin + this.z * cos);
  }
  
  rotate_z(z)
  {
    const cos = Math.cos(z);
    const sin = Math.sin(z);
    
    return new vec3_t(
      this.x * cos - this.y * sin,
      this.x * sin + this.y * cos,
      this.z);
  }
};
