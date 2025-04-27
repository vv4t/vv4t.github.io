"use strict"

import { vec3_t } from "../util/math.js";

const COLLIDER_WIDTH = 0.9;
const COLLIDER_HEIGHT = 0.9;

export class map_collider_t {
  constructor(map) {
    this.width = map.width;
    this.height = map.height;
    this.collision = new Uint8Array(map.width * map.height);
    this.triggers = map.triggers;

    for (let i = 0; i < map.collision.length; i++) {
      this.collision[i] = map.collision[i];
    }
  }
  
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return 1;
    }

    return this.collision[x + y * this.width];
  }

  check_trigger(body) {
    const triggers = [];

    for (const trigger of this.triggers) {
      if (
        body.pos.x + COLLIDER_WIDTH > trigger.pos.x &&
        body.pos.y + COLLIDER_HEIGHT > trigger.pos.y &&
        body.pos.x < trigger.pos.x + trigger.size.x &&
        body.pos.y < trigger.pos.y + trigger.size.y
      ) {
        triggers.push(trigger.name);
      }
    }

    return triggers;
  }

  check(x, y) {
    const x1 = Math.floor(x);
    const y1 = Math.floor(y);
    const x2 = Math.floor(x + COLLIDER_WIDTH);
    const y2 = Math.floor(y + COLLIDER_HEIGHT);

    if (this.get(x1, y1)) return true;
    if (this.get(x2, y1)) return true;
    if (this.get(x1, y2)) return true;
    if (this.get(x2, y2)) return true;

    return false;
  }

  collide(body) {
    const x1 = body.pos.x;
    const y1 = body.pos.y;
    const x2 = body.pos.x + body.vel.x;
    const y2 = body.pos.y + body.vel.y;

    if (this.check(x2, y2)) {
      if (!this.check(x1, y2)) return new vec3_t(1, 0);
      else if (!this.check(x2, y1)) return new vec3_t(0, 1);
      else return new vec3_t(1, 1);
    }

    return new vec3_t(0, 0);
  }
};
