"use strict";

import { vec3_t, mat4_t } from "../util/math.js";

export class camera_t {
  constructor() {
    this.pos = new vec3_t();
    this.projection = mat4_t.init_orthogonal(-9.5, 10.5, 8.0, -7.0, -10.0, 10.0);
    this.update_view();
  }

  bound(x, y) {
    this.bound_x = x;
    this.bound_y = y;
  }

  follow(v) {
    this.pos.set(v);

    this.pos.x = Math.max(9.5, this.pos.x);
    this.pos.y = Math.max(7.0, this.pos.y);

    if (this.bound_x) this.pos.x = Math.min(this.bound_x - 10.5, this.pos.x);
    if (this.bound_y) this.pos.y = Math.min(this.bound_y - 8.0, this.pos.y);
  }
  
  translate(v) {
    this.pos = this.pos.add(v);
  }
  
  update_view() {
    this.view = mat4_t.init_translation(this.pos.mulf(-1));
    this.view_projection = this.view.mul(this.projection);
  }
  
  get_mvp(model) {
    return model.mul(this.view_projection);
  }
};
