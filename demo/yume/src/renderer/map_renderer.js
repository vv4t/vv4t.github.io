"use strict";

import { vertex_t } from "./vertex.js";
import { sprite_sheet_t } from "./sprite_sheet.js";
import { vec2_t, vec3_t, mat4_t } from "../util/math.js";
import { TILE_SIZE } from "../core/map.js";

export const CHUNK_SIZE = 32;

export class map_renderer_t {
  constructor(mesh_buffer, map) {
    this.mesh_buffer = mesh_buffer;
    this.sprite_sheet = new sprite_sheet_t(map.tileset, TILE_SIZE);
    this.floor = [];
    this.ceiling = [];
    this.build_map(map);
  }

  destroy() {
    this.sprite_sheet.destroy();
  }

  render_floor(pos) {
    this.render_part(pos, this.floor);
  }

  render_ceiling(pos) {
    this.render_part(pos, this.ceiling);
  }
  
  render_part(pos, chunks) {
    this.sprite_sheet.bind();
    
    const chunk_pos = pos.mulf(1.0 / CHUNK_SIZE);
    const chunk_x1 = Math.floor(chunk_pos.x);
    const chunk_y1 = Math.floor(chunk_pos.y);

    const rel_x = chunk_pos.x - chunk_x1;
    const rel_y = chunk_pos.y - chunk_y1;
    
    const chunk_x2 = Math.floor(chunk_x1 + (rel_x > 0.5 ? 1 : -1));
    const chunk_y2 = Math.floor(chunk_y1 + (rel_y > 0.5 ? 1 : -1));

    this.render_chunk(chunks, chunk_x1, chunk_y1);
    this.render_chunk(chunks, chunk_x2, chunk_y1);
    this.render_chunk(chunks, chunk_x1, chunk_y2);
    this.render_chunk(chunks, chunk_x2, chunk_y2);
  }

  render_chunk(chunks, x, y) {
    if (x < 0 || y < 0 || x >= this.chunks_width || y >= this.chunks_height)
      return;

    chunks[y * this.chunks_width + x].draw();
  }
  
  build_map(map) {
    this.chunks_width = Math.ceil(map.width / CHUNK_SIZE);
    this.chunks_height = Math.ceil(map.height / CHUNK_SIZE);

    for (let i = 0; i < this.chunks_height; i++) {
      for (let j = 0; j < this.chunks_width; j++) {
        const [floor, ceiling] = this.build_chunk(map, j, i);
        this.floor.push(this.mesh_buffer.push(floor));
        this.ceiling.push(this.mesh_buffer.push(ceiling));
      }
    }
  }
  
  build_chunk(map, x, y) {
    const floor = [];
    const ceiling = [];

    const has_ceiling = map.layers.some((layer) => layer.name === "ceiling");
    let is_floor = true;

    for (let z = 0; z < map.layers.length; z++) {
      const layer = map.layers[z].data;

      if (has_ceiling) {
        if (map.layers[z].name === "ceiling") {
          is_floor = false;
        }
      } else {
        is_floor = z < 1;
      }

      for (let i = 0; i < CHUNK_SIZE; i++) {
        for (let j = 0; j < CHUNK_SIZE; j++) {
          const xt = x * CHUNK_SIZE + j;
          const yt = y * CHUNK_SIZE + i;

          if (xt < 0 || yt < 0 || xt >= map.width || yt >= map.height)
            continue;

          const sprite_id = layer[yt * map.width + xt];
          if (sprite_id === 0)
            continue;
          
          const tile = this.build_tile(xt, yt, is_floor ? z * 0.01 : z, sprite_id - 1);
          if (is_floor) floor.push(...tile);
          else ceiling.push(...tile);
        }
      }
    }

    return [floor, ceiling];
  }
  
  build_tile(x, y, z, sprite_id) {
    const x1 = x;
    const x2 = x + 1;
    const y1 = y;
    const y2 = y + 1;
    
    const [uv1,uv2] = this.sprite_sheet.get_uv(sprite_id);

    return [
      new vertex_t(new vec3_t(x2, y2, z), new vec2_t(uv2.x, uv1.y)),
      new vertex_t(new vec3_t(x2, y1, z), new vec2_t(uv2.x, uv2.y)),
      new vertex_t(new vec3_t(x1, y2, z), new vec2_t(uv1.x, uv1.y)),
      new vertex_t(new vec3_t(x1, y1, z), new vec2_t(uv1.x, uv2.y)),
      new vertex_t(new vec3_t(x1, y2, z), new vec2_t(uv1.x, uv1.y)),
      new vertex_t(new vec3_t(x2, y1, z), new vec2_t(uv2.x, uv2.y))
    ];
  }
};
