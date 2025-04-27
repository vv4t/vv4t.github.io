"use strict"

import { vec3_t } from "../util/math.js";

export class body_t {
  constructor() {
    this.pos = new vec3_t();
    this.vel = new vec3_t();
  }
};
