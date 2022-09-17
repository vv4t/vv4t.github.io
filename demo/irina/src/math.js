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

  static cross_up(a, b)
  {
    return new vec2_t(a.y * b, -a.x * b);
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
  
  static mul(a, b)
  {
    return new vec2_t(a.x * b.x, a.y * b.y);
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
  
  static plane_project(v, plane)
  {
    return vec2_t.dot(v, plane.normal) - plane.distance;
  }
};

export class plane_t {
  constructor(normal = new vec2_t(0.0, 1.0), distance = 0.0)
  {
    this.normal = normal;
    this.distance = distance;
  }
  
  static flip(plane)
  {
    return new plane_t(vec2_t.mulf(plane.normal, -1), -plane.distance);
  }
};

export function clamp(a, b, c)
{
  return Math.min(Math.max(a, b), c);
}

export function to_rad(deg)
{
  return deg * Math.PI / 180.0;
}
