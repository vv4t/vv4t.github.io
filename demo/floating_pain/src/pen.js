import { vec2_t } from "./math.js";

export class pen_t {
  constructor(canvas, cam)
  {
    this.canvas = canvas;
    this.cam = cam;
    this.half_width = this.canvas.width / 2.0;
    this.half_height = this.canvas.height / 2.0;
    this.ctx = this.canvas.getContext("2d");
  }
  
  to_screen_space(pos)
  {
    const cam_pos = this.cam.to_cam_space(pos);
    return new vec2_t(
      (cam_pos.x + 1.0) * this.half_width,
      (-cam_pos.y + 1.0) * this.half_height
    );
  }
  
  circle(pos, radius)
  {
    const screen_pos = this.to_screen_space(pos);
    this.ctx.beginPath();
    this.ctx.arc(screen_pos.x, screen_pos.y, radius * this.half_width / this.cam.fov, 0, 2 * Math.PI);
    this.ctx.closePath();
    this.ctx.stroke();
  }
  
  color(str)
  {
    this.ctx.strokeStyle = str;
  }
  
  line(a, b)
  {
    const screen_a = this.to_screen_space(a);
    const screen_b = this.to_screen_space(b);
    
    this.ctx.beginPath();
    this.ctx.moveTo(screen_a.x, screen_a.y);
    this.ctx.lineTo(screen_b.x, screen_b.y);
    this.ctx.closePath();
    this.ctx.stroke();
  }
  
  rect(pos, width, height)
  {
    const scale_width = width * this.half_width / this.cam.fov;
    const scale_height = height * this.half_height / this.cam.fov;
    
    const screen_pos = this.to_screen_space(pos);
    this.ctx.beginPath();
    this.ctx.strokeRect(screen_pos.x - scale_width / 2, screen_pos.y - scale_height / 2, scale_width, scale_height);
    this.ctx.closePath();
    this.ctx.stroke();
  }
  
  clear()
  {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
};
