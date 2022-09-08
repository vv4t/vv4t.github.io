import { vec2_t } from "./math.js";

export class cam_t {
  constructor(fov)
  {
    this.pos = new vec2_t();
    this.rot = 0.0;
    this.fov = fov;
  }
  
  to_cam_space(v)
  {
    const pos_v = v.sub(this.pos);
    const rot_v = pos_v.rotate(-this.rot);
    
    return rot_v.mulf(1.0 / this.fov);
  }
  
  from_cam_space(v)
  {
    return new vec2_t(
      v.x * this.fov + this.pos.x,
      v.y * this.fov + this.pos.y);
  }
};
