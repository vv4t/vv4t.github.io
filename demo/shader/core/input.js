"use strict";

export class input_t {
  constructor(canvas) {
    this.mouse_x = 0;
    this.mouse_y = 0;
    this.input_down = {};
    this.mouse_lock = false;
    
    canvas.addEventListener("click", (e) => {
      console.log(e.button);
      if (this.mouse_lock) {
        canvas.requestPointerLock();
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (this.mouse_lock) {
        this.mouse_x += e.movementX;
        this.mouse_y += e.movementY;
      } else {
        this.mouse_x = e.offsetX;
        this.mouse_y = e.offsetY;
      }
    });
    
    document.addEventListener("keydown", (e) => {
      this.input_down[e.keyCode] = true;
    });
    
    document.addEventListener("keyup", (e) => {
      delete this.input_down[e.keyCode];
    });
  }
  
  set_mouse_lock(lock) {
    this.mouse_lock = true;
  }

  get_key(key) {
    return key.charCodeAt(0) in this.input_down;
  }

  get_mouse_x() {
    return this.mouse_x;
  }

  get_mouse_y() {
    return this.mouse_y;
  }
};
