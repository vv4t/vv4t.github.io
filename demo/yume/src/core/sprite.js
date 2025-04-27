"use strict"

export class sprite_t {
  constructor(size, sprite_id) {
    this.size = size;
    this.sprite_id = sprite_id;
    this.frame_start = 0;
    this.frame_count = 0;
    this.frame_time = 0.0;
    this.frame_delta = 0.0;
  }

  animate(frame_start, frame_count, frame_delta) {
    this.frame_start = frame_start;
    this.frame_count = frame_count;
    this.frame_delta = frame_delta;
  }

  stop() {
    this.sprite_id = this.frame_start;
    this.frame_count = 0;
  }
};
