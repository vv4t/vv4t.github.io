"use strict";

import { vec2_t } from "./math.js";

export class draw_t {
  canvas;
  ctx;
  half_width;
  half_height;
  
  constructor(canvas)
  {
    this.canvas = canvas;
    this.half_width = this.canvas.width / 2.0;
    this.half_height = this.canvas.height / 2.0;
    this.ctx = canvas.getContext("2d");
  }
  
  color(new_color)
  {
    this.ctx.strokeStyle = new_color;
  }
  
  clear()
  {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  screen_space(v)
  {
    return new vec2_t((v.x + 1) * this.half_width, (-v.y + 1) * this.half_height);
  }
  
  begin()
  {
    this.ctx.beginPath();
  }
  
  line(a, b)
  {
    const screen_a = this.screen_space(a);
    const screen_b = this.screen_space(b);
    
    this.ctx.moveTo(screen_a.x, screen_a.y);
    this.ctx.lineTo(screen_b.x, screen_b.y);
  }
  
  circle(pos, radius)
  {
    if (radius < 0)
      return;
    
    const screen_pos = this.screen_space(pos);
    this.ctx.moveTo(screen_pos.x + radius * this.half_width, screen_pos.y);
    this.ctx.arc(screen_pos.x, screen_pos.y, radius * this.half_width, 0, 2 * Math.PI);
  }
  
  stroke()
  {
    this.ctx.stroke();
  }
};
