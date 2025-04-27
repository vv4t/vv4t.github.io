"use strict"

import { vertex_t } from "./vertex.js";
import { sprite_sheet_t } from "./sprite_sheet.js";
import { vec2_t, vec3_t, mat4_t } from "../util/math.js";

const MAX_TILES = 32;

export class sprite_renderer_t {
  constructor(mesh_buffer, game) {
    this.mesh_buffer = mesh_buffer;
    this.sprite_sheet = new sprite_sheet_t("assets/tilesets/sprites.png");
    this.num_vertices = 0;
    this.mesh = this.mesh_buffer.allocate(32 * MAX_TILES);
    this.game = game;
  }
  
  render() {
    this.sprite_sheet.bind();
    this.update_mesh();
    this.mesh.sub_draw(0, this.num_vertices);
  }
  
  update_mesh() {
    const vertices = [];

    for (const entity in this.game.c_sprite) {
      if (!(entity in this.game.c_body)) continue;
      
      const body = this.game.c_body[entity];
      const sprite = this.game.c_sprite[entity];

      vertices.push(...this.build_sprite(body.pos, sprite.size, sprite.sprite_id));
    }
    
    this.mesh_buffer.put(this.mesh, 0, vertices);
    this.num_vertices = vertices.length;
  }
  
  build_sprite(pos, size, sprite_id) {
    const p1 = pos;
    const p2 = pos.add(new vec3_t(size.x, size.y, 0));
    
    const [uv1, uv2] = this.sprite_sheet.get_uv(sprite_id, size);

    return [
      new vertex_t(new vec3_t(p2.x, p2.y, 0.5), new vec2_t(uv2.x, uv1.y)),
      new vertex_t(new vec3_t(p2.x, p1.y, 0.5), new vec2_t(uv2.x, uv2.y)),
      new vertex_t(new vec3_t(p1.x, p2.y, 0.5), new vec2_t(uv1.x, uv1.y)),
      new vertex_t(new vec3_t(p1.x, p1.y, 0.5), new vec2_t(uv1.x, uv2.y)),
      new vertex_t(new vec3_t(p1.x, p2.y, 0.5), new vec2_t(uv1.x, uv1.y)),
      new vertex_t(new vec3_t(p2.x, p1.y, 0.5), new vec2_t(uv2.x, uv2.y))
    ];
  }
};
