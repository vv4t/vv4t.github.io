"use strict";

export function rand()
{
  return Math.random() - 0.5;
}

export class vec2_t {
  constructor(x = 0.0, y = 0.0)
  {
    this.x = x;
    this.y = y;
  }
  
  copy()
  {
    return new vec2_t(this.x, this.y);
  }

  mulf(v)
  {
    return new vec2_t(this.x * v, this.y * v);
  }
  
  add(v)
  {
    return new vec2_t(this.x + v.x, this.y + v.y);
  }
  
  sub(v)
  {
    return new vec2_t(this.x - v.x, this.y - v.y);
  }
  
  length()
  {
    return Math.sqrt(this.dot(this));
  }
  
  dot(v)
  {
    return this.x * v.x + this.y * v.y;
  }
  
  floor()
  {
    return new vec2_t(
      Math.floor(this.x),
      Math.floor(this.y)
    );
  }

  static rotate(a, theta)
  {
    const cos_theta = Math.cos(theta);
    const sin_theta = Math.sin(theta);
    
    return new vec2_t(a.x * cos_theta - a.y * sin_theta, a.x * sin_theta + a.y * cos_theta);
  }

  static dot(a, b)
  {
    return a.x * b.x + a.y * b.y;
  }

  static cross_up(a)
  {
    return new vec2_t(-a.y, a.x);
  }
  
  static cross(a, b)
  {
    return a.x * b.y - a.y * b.x;
  }

  static mulf(a, b)
  {
    return new vec2_t(a.x * b, a.y * b);
  }

  static add(a, b)
  {
    return new vec2_t(a.x + b.x, a.y + b.y);
  }

  static sub(a, b)
  {
    return new vec2_t(a.x - b.x, a.y - b.y);
  }
  
  static length(v)
  {
    return Math.sqrt(vec2_t.dot(v, v));
  }
  
  static normalize(v)
  {
    const d = vec2_t.length(v);
    
    if (d > 0)
      return vec2_t.mulf(v, 1.0 / d);
    else
      return new vec2_t(0.0, 0.0);
  }
};

export class plane_t {
  constructor(normal = new vec2_t(0.0, 1.0), distance = 0.0)
  {
    this.normal = normal;
    this.distance = distance;
  }
};

export function to_rad(deg)
{
  return deg * Math.PI / 180.0;
}
