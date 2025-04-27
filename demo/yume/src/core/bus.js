"use strict";

export class bus_t {
  constructor() {
    this.queue = [];
  }

  raise_events(events) {
    this.queue.push(...events);
  }

  read_events() {
    const read = [...this.queue];
    this.queue = []
    return read;
  }
};
