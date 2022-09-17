"use strict";

import { vec2_t } from "./math.js";

export class input_t {
  keys;
  invsere_fov;
  mouse_x;
  mouse_y;
  canvas;
  mouse_button;
  
  constructor(canvas)
  {
    this.keys = {};
    this.inverse_fov = 10;
    this.canvas = canvas;
    this.mouse_down = false;
    document.addEventListener("keydown", (e) => {
      this.keys[e.keyCode] = true;
    });
    document.addEventListener("keyup", (e) => {
      this.keys[e.keyCode] = false;
    });
    canvas.addEventListener("mousemove", (e) => {
      this.mouse_x = e.offsetX;
      this.mouse_y = e.offsetY;
    });
    canvas.addEventListener("mousedown", (e) => {
      this.mouse_button = true;
    });
    canvas.addEventListener("mouseup", (e) => {
      this.mouse_button = false;
    });
  }
  
  world_space(v)
  {
    return new vec2_t((v.x - this.canvas.width / 2) / this.inverse_fov, -(v.y - this.canvas.height / 2) / this.inverse_fov);
  }
  
  mouse_pos()
  {
    return this.world_space(new vec2_t(this.mouse_x, this.mouse_y));
  }
  
  get_mouse_button()
  {
    return this.mouse_button;
  }
  
  get_key(key)
  {
    if (this.keys[key.charCodeAt(0)] == undefined)
      return false;
    
    return this.keys[key.charCodeAt(0)];
  }
};
