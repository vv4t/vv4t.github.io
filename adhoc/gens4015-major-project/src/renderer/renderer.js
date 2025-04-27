"use strict"

import { gl } from "./display.js";
import { camera_t } from "./camera.js";
import { mesh_buffer_t } from "./mesh.js";
import { map_renderer_t } from "./map_renderer.js";
import { world_shader_t } from "./world_shader.js";
import { sprite_sheet_t } from "./sprite_sheet.js";
import { sprite_renderer_t } from "./sprite_renderer.js";
import { vec2_t, vec3_t, mat4_t } from "../util/math.js";

export class renderer_t {
  constructor(game) {
    this.game = game;
    
    this.mesh_buffer = new mesh_buffer_t(1024 * 1024);
    this.camera = new camera_t();
    this.world_shader = new world_shader_t();
    this.sprite_renderer = new sprite_renderer_t(this.mesh_buffer, this.game);
    this.base_mesh = this.mesh_buffer.top_ptr;
    
    this.world_shader.bind();
    this.mesh_buffer.bind();
    
    gl.clearColor(0.5, 0.7, 1.0, 1.0);
    gl.enable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  load_map(map) {
    if (this.map_renderer) this.map_renderer.destroy();
    this.mesh_buffer.reset(this.base_mesh);
    this.map_renderer = new map_renderer_t(this.mesh_buffer, map);
    this.camera.bound(map.width, map.height);
  }
  
  render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.camera.follow(this.game.c_body[this.game.player.id].pos);
    this.camera.update_view();
    this.world_shader.set_mvp(this.camera.get_mvp(mat4_t.init_identity()));
    this.map_renderer.render_floor(this.camera.pos);
    this.sprite_renderer.render();
    this.map_renderer.render_ceiling(this.camera.pos);
  }
};
