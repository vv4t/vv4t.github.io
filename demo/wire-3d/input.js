"use strict";

import { vec2_t } from "./math.js";

export class key {
  static code(key)
  {
    return key.charCodeAt(0);
  }
  
  static SHIFT = 16;
  static ALT   = 18;
  
  static WHEEL_DOWN = 256;
  static WHEEL_UP = 257;
};

export class input_t {
  constructor(canvas)
  {
    this.canvas = canvas;
    this.key_state = {};
    this.binds = {};
    this.mouse_state = false;
    this.mouse_pos = new vec2_t();
    canvas.addEventListener("mousemove", (e) => {
      if (this.lock_status()) {
        const delta_pos = new vec2_t(e.movementX, -e.movementY);
        this.mouse_pos = this.mouse_pos.add(delta_pos.mulf(1.0 / (this.canvas.width / 2.0)));
      } else {
        this.mouse_pos = this.from_screen_space(new vec2_t(e.offsetX, e.offsetY));
      }
    });
    canvas.addEventListener("mousedown", (e) => {
      this.mouse_state = true;
    });
    canvas.addEventListener("mouseup", (e) => {
      this.mouse_state = false;
    });
    document.addEventListener("wheel", (e) => {
      if (e.deltaY > 0) {
        if (this.binds[key.WHEEL_DOWN])
          this.binds[key.WHEEL_DOWN].fn_down();
      } else {
        if (this.binds[key.WHEEL_UP])
          this.binds[key.WHEEL_UP].fn_down();
      }
    });
    document.addEventListener("keydown", (e) => {
      this.key_state[e.keyCode] = true;
      
      if (this.binds[e.keyCode]) {
        if (this.binds[e.keyCode].fn_down)
          this.binds[e.keyCode].fn_down();
      }
    });
    document.addEventListener("keyup", (e) => {
      this.key_state[e.keyCode] = false;
      
      if (this.binds[e.keyCode]) {
        if (this.binds[e.keyCode].fn_up)
          this.binds[e.keyCode].fn_up();
      }
    });
  }
  
  bind(code, fn_down, fn_up)
  {
    this.binds[code] = {
      fn_down: fn_down,
      fn_up: fn_up
    };
  }
  
  from_screen_space(pos)
  {
    return new vec2_t(
      pos.x / (this.canvas.height / 2.0) - canvas.width / canvas.height,
      -pos.y / (this.canvas.height / 2.0) + 1);
    return new vec2_t(
      pos.x / (this.canvas.width / 2.0) - 1,
      -pos.y / (this.canvas.height / 2.0) + 1);
  }
  
  get_mouse_pos()
  {
    return this.mouse_pos;
  }
  
  get_key(key_code)
  {
    if (this.key_state[key_code]) // for undefined case as well
      return this.key_state[key_code];
    else
      return false;
  }
  
  get_mouse_down()
  {
    return this.mouse_state;
  }
  
  lock()
  {
    this.mouse_pos = new vec2_t();
    canvas.requestPointerLock();
  }
  
  lock_status()
  {
    return document.pointerLockElement == this.canvas;
  }
  
  unlock()
  {
    canvas.exitPointerLock();
  }
};
