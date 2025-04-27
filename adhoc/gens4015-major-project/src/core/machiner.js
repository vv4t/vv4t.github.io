"use strict"

import { body_t } from "./body.js";
import { sprite_t } from "./sprite.js";
import { vec2_t, vec3_t } from "../util/math.js";

export class machiner_t {
  constructor(id, pos) {
    this.id = id;
    this.body = new body_t();
    this.body.pos = pos;
    this.sprite = new sprite_t(new vec2_t(3,6), 8);
    // this.sprite = new sprite_t(new vec2_t(3,6), 11);
  }

  move_to_target(target) {
    const delta = target.add(this.body.pos.mulf(-1));
    this.body.vel = delta.mulf(0.05);
    return delta.dot(delta) < 0.25;
  }
};
