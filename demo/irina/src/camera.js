"use strict"

import { vec2_t, to_rad } from "./math.js";

export class camera_t {
  pos;
  z_height;
  z_rot;
  tan_half_fov;
  
  constructor()
  {
    this.pos = new vec2_t();
    this.z_height = 1.0;
    this.z_rot = 0.0;
    this.tan_half_fov = 1.0;
    this.set_fov(to_rad(90));
  }
  
  set_fov(theta)
  {
    this.tan_half_fov = Math.tan(theta / 2.0);
  }
  
  camera_space(pos)
  {
    const cam_pos = vec2_t.sub(pos, this.pos);
    const cam_rot = vec2_t.rotate(cam_pos, this.z_rot);
    
    return cam_rot;
  }
};
