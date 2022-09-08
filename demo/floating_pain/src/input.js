"use strict";

import { vec2_t } from "./math.js";

export class key_t {
  static code(c)
  {
    return c.charCodeAt(0);
  }
  
  static SHIFT = 16;
  static ALT   = 18;
};

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
    this.binds = {};
    this.inverse_fov = 10;
    this.canvas = canvas;
    this.mouse_down = false;
    this.is_lock = false;
    this.wheel = 0;
    document.addEventListener("keydown", (e) => {
      if (this.binds[e.keyCode])
        this.binds[e.keyCode]();
      
      this.keys[e.keyCode] = true;
    });
    document.addEventListener("keyup", (e) => {
      this.keys[e.keyCode] = false;
    });
    canvas.addEventListener("mousemove", (e) => {
      if (this.is_lock) {
        this.mouse_x += e.movementX;
        this.mouse_y += e.movementY;
      } else {
        this.mouse_x = e.offsetX;
        this.mouse_y = e.offsetY;
      }
    });
    canvas.addEventListener("mousedown", (e) => {
      this.mouse_button = true;
    });
    canvas.addEventListener("mouseup", (e) => {
      this.mouse_button = false;
    });
    document.addEventListener("mousewheel", (e) => {
      this.wheel += e.wheelDelta;
    });
    
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
  }
  
  get_wheel()
  {
    return this.wheel;
  }
  
  lock()
  {
    this.is_lock = true;
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.canvas.requestPointerLock();
  }
  
  unlock()
  {
    this.is_lock = false;
    this.mouse_x = 0;
    this.mouse_y = 0;
    document.exitPointerLock();
  }
  
  bind(key, action)
  {
    this.binds[key] = action;
  }
  
  to_screen_space(v)
  {
    return new vec2_t(
      v.x * 2.0 / this.canvas.width - 1.0,
      -v.y * 2.0 / this.canvas.height + 1.0
    );
  }
  
  mouse_pos()
  {
    return this.to_screen_space(new vec2_t(this.mouse_x, this.mouse_y));
  }
  
  get_mouse_button()
  {
    return this.mouse_button;
  }
  
  get_key(key)
  {
    if (this.keys[key] == undefined)
      return false;
    
    return this.keys[key];
  }
};
