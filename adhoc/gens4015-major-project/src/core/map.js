"use strict";

import { get_asset } from "../core/assets.js";
import { vec3_t } from "../util/math.js";
import { path_simplify } from "../util/path.js";

export const TILE_SIZE = 32;

export class layer_t {
  constructor(name, data) {
    this.name = name;
    this.data = data;
  }
};

export class trigger_t {
  constructor(name, pos, size) {
    this.name = name;
    this.pos = pos;
    this.size = size;
  }
};

export class spawn_t {
  constructor(name, pos) {
    this.name = name;
    this.pos = pos;
  }
};

export class map_t {
  constructor(name) {
    const base_dir = "assets/maps";
    const data = get_asset(`${base_dir}/${name}.tmj`);

    this.tileset = path_simplify(`${base_dir}/${data.tilesets[0].image}`);
    this.width = data.width;
    this.height = data.height;
    this.spawns = [];
    this.triggers = [];
    this.layers = [];

    for (const layer of data.layers) {
      if (layer.name === "triggers") {
        for (const trigger of layer.objects) {
          const size = new vec3_t(trigger.width / TILE_SIZE, trigger.height / TILE_SIZE, 1);
          const pos = new vec3_t(trigger.x / TILE_SIZE, data.height - trigger.y / TILE_SIZE - size.y, 0);
          const name = trigger.name;
          this.triggers.push(new trigger_t(name, pos, size));
        }
      } else if (layer.name === "spawns") {
        for (const spawn of layer.objects) {
          const pos = new vec3_t(Math.floor(spawn.x / TILE_SIZE), Math.floor(data.height - spawn.y / TILE_SIZE), 0);
          const name = spawn.name;
          this.spawns.push(new spawn_t(name, pos));
        }
      } else {
        const data = new Uint32Array(this.width * this.height);

        for (let y = 0; y < this.height; y++) {
          for (let x = 0; x < this.width; x++) {
            data[y * this.width + x] = layer.data[(this.height - y - 1) * this.width + x];
          }
        }

        if (layer.name === "collision") this.collision = data;
        else this.layers.push(new layer_t(layer.name, data));
      }
    }

    if (!this.collision)
      this.collision = new Uint8Array(this.width * this.height);
  }
}
