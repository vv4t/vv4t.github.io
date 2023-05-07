
export class Vector2 {
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
  }
  
  add(v)
  {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  
  sub(v)
  {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  
  mulf(v)
  {
    this.x *= v;
    this.y *= v;
    return this;
  }
  
  copy()
  {
    return new Vector2(this.x, this.y);
  }
};

export class Vector3 {
  constructor(x, y, z)
  {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  add(v)
  {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    
    return this;
  }
  
  cross(v)
  {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.y - this.y * v.z;
    const z = this.x * v.x - this.x * v.x;
    
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  sub(v)
  {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    
    return this;
  }
  
  mulf(f)
  {
    this.x *= f;
    this.y *= f;
    this.z *= f;
    
    return this;
  }
  
  dot(v)
  {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  
  normalize()
  {
    const vecLength = this.length();
    if (vecLength == 0) {
      this.x = 0;
      this.y = 0;
      this.z = 0;
    } else {
      this.mulf(1.0 / vecLength);
    }
    return this;
  }
  
  length()
  {
    return Math.sqrt(this.dot(this));
  }
  
  rotateZ(angle)
  {
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);
    
    const rotX = this.x;
    const rotY = this.y;
    
    this.x = rotX * cosAngle - rotY * sinAngle;
    this.y = rotX * sinAngle + rotY * cosAngle;
    
    return this;
  }
  
  copy()
  {
    return new Vector3(this.x, this.y, this.z);
  }
};

export function degToRad(degAngle)
{
  return degAngle * Math.PI / 2.0;
}

export function clamp(value, rangeMin, rangeMax)
{
  return Math.max(Math.min(value, rangeMax), rangeMin);
}

export function rand()
{
  return Math.random() - 0.5;
}

export function euclidean_distance(pos1, pos2) 
{
  return Math.sqrt((pos2[0]-pos1[0])**2 + (pos2[1]-pos1[1])**2)
}
