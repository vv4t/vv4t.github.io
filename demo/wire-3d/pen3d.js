"use strict";

import { vec2_t } from "./math.js";

export class pen3d_t {
  constructor(pen, camera, aspect_ratio = 1.0)
  {
    this.camera = camera;
    this.pen = pen;
    this.aspect_ratio = aspect_ratio;
    this.z_clip = 0.1;
  }
  
  z_project(z_dist)
  {
    return 1.0 / z_dist;
  }
  
  view_space(pos)
  {
    const z_project = this.z_project(pos.z);
    
    return new vec2_t(
      pos.x * z_project * this.aspect_ratio,
      pos.y * z_project
    );
  }
  
  circle(pos, radius)
  {
    const cam_pos = this.camera.space(pos);
    const view_pos = this.view_space(cam_pos);
    const view_radius = radius * this.z_project(cam_pos.z);
    
    if (cam_pos.z > this.z_clip + radius)
      this.pen.circle(view_pos, view_radius);
  }
  
  line(pos_a, pos_b)
  {
    const cam_pos_a = this.camera.space(pos_a);
    const cam_pos_b = this.camera.space(pos_b);
    
    if (cam_pos_a.z < this.z_clip && cam_pos_b.z < this.z_clip) {
      return;
    } else if (cam_pos_a.z < this.z_clip) {
      const m_x = (cam_pos_b.x - cam_pos_a.x) / (cam_pos_b.z - cam_pos_a.z);
      const m_y = (cam_pos_b.y - cam_pos_a.y) / (cam_pos_b.z - cam_pos_a.z);
      
      cam_pos_a.x = cam_pos_a.x + m_x * (this.z_clip - cam_pos_a.z);
      cam_pos_a.y = cam_pos_a.y + m_y * (this.z_clip - cam_pos_a.z);
      cam_pos_a.z = this.z_clip;
    } else if (cam_pos_b.z < this.z_clip) {
      const m_x = (cam_pos_a.x - cam_pos_b.x) / (cam_pos_a.z - cam_pos_b.z);
      const m_y = (cam_pos_a.y - cam_pos_b.y) / (cam_pos_a.z - cam_pos_b.z);
      
      cam_pos_b.x = cam_pos_b.x + m_x * (this.z_clip - cam_pos_b.z);
      cam_pos_b.y = cam_pos_b.y + m_y * (this.z_clip - cam_pos_b.z);
      cam_pos_b.z = this.z_clip;
    }
    
    const view_pos_a = this.view_space(cam_pos_a);
    const view_pos_b = this.view_space(cam_pos_b);
    
    this.pen.line(view_pos_a, view_pos_b);
  }
};
