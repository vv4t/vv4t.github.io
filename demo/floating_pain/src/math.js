
export class vec2_t {
  constructor(x = 0, y = 0)
  {
    this.x = x;
    this.y = y;
  }
  
  add(v)
  {
    return new vec2_t(this.x + v.x, this.y + v.y);
  }
  
  sub(v)
  {
    return new vec2_t(this.x - v.x, this.y - v.y);
  }
  
  mul(v)
  {
    return new vec2_t(this.x * v.x, this.y * v.y);
  }
  
  mulf(v)
  {
    return new vec2_t(this.x * v, this.y * v);
  }
  
  dot(v)
  {
    return this.x * v.x + this.y * v.y;
  }
  
  length()
  {
    return Math.sqrt(this.dot(this));
  }
  
  cross_up(f = 1)
  {
    return new vec2_t(
      this.y * f,
      -this.x * f
    );
  }
  
  normalize()
  {
    const l = this.length();
    if (l < 0.1)
      return new vec2_t();
    return this.mulf(1.0 / l);
  }
  
  rotate(theta)
  {
    const cos_theta = Math.cos(theta);
    const sin_theta = Math.sin(theta);
    
    return new vec2_t(
      this.x * cos_theta - this.y * sin_theta,
      this.x * sin_theta + this.y * cos_theta
    );
  }
};

export function rand()
{
  return Math.random() - 0.5;
}
