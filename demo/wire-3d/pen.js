"use strict";

import { vec2_t } from "./math.js";

export class pen_t {
  constructor(canvas)
  {
    this.canvas = canvas;
    this.aspect_ratio = canvas.height / canvas.width
    this.ctx = canvas.getContext("2d");
  }
  
  screen_space(pos)
  {
    return new vec2_t(
      (pos.x + 1) * this.canvas.height / 2.0,
      (-pos.y + 1) * this.canvas.height / 2.0);
  }
  
  clear()
  {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  begin()
  {
    this.ctx.beginPath();
  }
  
  circle(pos, radius)
  {
    const screen_pos = this.screen_space(pos);
    const screen_radius = radius * this.canvas.height / 2.0;
    this.ctx.moveTo(screen_pos.x + screen_radius, screen_pos.y);
    this.ctx.arc(screen_pos.x, screen_pos.y, screen_radius, 0, 2 * Math.PI);
  }
  
  line(pos_a, pos_b)
  {
    const screen_pos_a = this.screen_space(pos_a);
    const screen_pos_b = this.screen_space(pos_b);
    this.ctx.moveTo(screen_pos_a.x, screen_pos_a.y);
    this.ctx.lineTo(screen_pos_b.x, screen_pos_b.y);
  }
  
  rect(pos, w, h)
  {
    const screen_pos = this.screen_space(pos);
    const screen_w = w * this.canvas.height / 2.0;
    const screen_h = h * this.canvas.height / 2.0;
    this.ctx.moveTo(screen_pos.x, screen_pos.y);
    this.ctx.rect(screen_pos.x, screen_pos.y, screen_w, screen_h);
  }
  
  stroke()
  {
    this.ctx.stroke();
  }
  
  color(stroke_col)
  {
    this.ctx.strokeStyle = stroke_col;
  }
};
