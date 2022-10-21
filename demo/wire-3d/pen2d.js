"use strict";

import { vec2_t } from "./math.js";

export class pen2d_t {
  constructor(pen)
  {
    this.pen = pen;
    this.pos = new vec2_t();
    this.scale = 0.3;
  }
  
  circle(pos, radius)
  {
    const cam_pos = pos.sub(this.pos).mulf(this.scale);
    this.pen.circle(cam_pos, radius * this.scale);
  }
  
  line(a, b)
  {
    const cam_a = a.sub(this.pos).mulf(this.scale);
    const cam_b = b.sub(this.pos).mulf(this.scale);
    
    this.pen.line(cam_a, cam_b);
  }
};

const pen2d = new pen2d_t(pen);

