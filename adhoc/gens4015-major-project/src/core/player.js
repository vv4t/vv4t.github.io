"use strict"
    
import { body_t } from "./body.js";
import { sprite_t } from "./sprite.js";
import { input_axis } from "./input.js";
import { vec2_t, vec3_t } from "../util/math.js";

export class player_t {
  constructor(id) {
    this.id = id;
    this.body = new body_t();
    this.sprite = new sprite_t(new vec2_t(1, 2), 0);
    this.stopped = false;
    this.tick = 0;
  }

  spawn(pos) {
    this.body.pos = pos;
  }

  stop() {
    this.body.vel = new vec3_t();
    this.sprite.stop();
    this.stopped = true;
  }

  start() {
    this.stopped = false;
  }
  
  move(input) {
    if (this.stopped) return;

    let move = new vec3_t();
    
    if (input.is_axis(input_axis.UP)) move.y += 1.0;
    if (input.is_axis(input_axis.DOWN)) move.y -= 1.0;
    if (input.is_axis(input_axis.LEFT)) move.x -= 1.0;
    if (input.is_axis(input_axis.RIGHT)) move.x += 1.0;
    
    const FRAME_TIME = 0.2;
    const WALK_FRAMES = 3;
    
    if (input.is_axis(input_axis.LEFT)) this.sprite.animate(84, WALK_FRAMES, FRAME_TIME);
    else if (input.is_axis(input_axis.RIGHT)) this.sprite.animate(56, WALK_FRAMES, FRAME_TIME);
    else if (input.is_axis(input_axis.UP)) this.sprite.animate(28, WALK_FRAMES, FRAME_TIME);
    else if (input.is_axis(input_axis.DOWN)) this.sprite.animate(0, 3, FRAME_TIME);
    else this.sprite.stop();
    
    this.body.vel = move.mulf(0.125);
    
    this.tick++;
  }
};
