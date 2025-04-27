"use strict";

export const input_axis = {
  NONE:   0,
  UP:     1 << 0,
  DOWN:   1 << 1,
  LEFT:   1 << 2,
  RIGHT:  1 << 3,
  USE:    1 << 4
};

export class input_t {
  constructor() {
    this.axis = input_axis.NONE;
    this.key_to_axis_bindings = {};
    
    document.addEventListener("keyup", (e) => {
      if (e.keyCode in this.key_to_axis_bindings) {
        this.axis &= ~this.key_to_axis_bindings[e.keyCode];
      }
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.keyCode in this.key_to_axis_bindings) {
        this.axis |= this.key_to_axis_bindings[e.keyCode];
      }
    });
  }
  
  bind_key_to_axis(key, axis) {
    this.key_to_axis_bindings[key.toUpperCase().charCodeAt(0)] = axis;
  }
  
  is_axis(axis) {
    return (this.axis & axis) > 0;
  }
};
