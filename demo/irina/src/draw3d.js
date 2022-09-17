"use strict";

import { vec2_t } from "./math.js";

export class draw3d_t {
  draw;
  camera;
  
  constructor(draw, camera)
  {
    this.draw = draw;
    this.camera = camera;
  }
  
  project_3d(y_dist)
  {
    return 1 / y_dist * this.camera.tan_half_fov;
  }
  
  screen_space(pos)
  {
    const y_project = this.project_3d(pos.y);
    
    return new vec2_t(
      pos.x * y_project,
      -this.camera.z_height * y_project
    );
  }
  
  circle(pos, radius)
  {
    const cam_pos = this.camera.camera_space(pos);
    const screen_pos = this.screen_space(cam_pos);
    
    this.draw.circle(screen_pos, radius * this.project_3d(cam_pos.y));
  }
  
  line(a, b)
  {
    const cam_a = this.camera.camera_space(a);
    const cam_b = this.camera.camera_space(b);
    
    const z_clip = 1.0;
      
    if (cam_a.y < z_clip && cam_b.y < z_clip) {
      return;
    } else if (cam_a.y < z_clip) {
      const m = (cam_b.x - cam_a.x) / (cam_b.y - cam_a.y);
      cam_a.x = cam_a.x + m * (z_clip - cam_a.y);
      cam_a.y = z_clip;
    } else if (cam_b.y < z_clip) {
      const m = (cam_a.x - cam_b.x) / (cam_a.y - cam_b.y);
      cam_b.x = cam_b.x + m * (z_clip - cam_b.y);
      cam_b.y = z_clip;
    }
    
    const screen_a = this.screen_space(cam_a);
    const screen_b = this.screen_space(cam_b);
    
    this.draw.line(screen_a, screen_b);
  }
  
  plane(plane, length)
  {
    const p = vec2_t.mulf(plane.normal, plane.distance);
    const tangent = vec2_t.cross_up(plane.normal, length);
    const a = vec2_t.add(p, tangent);
    const b = vec2_t.sub(p, tangent);
    
    this.line(a, b);
    this.line(p, vec2_t.add(p, plane.normal));
  }
};
