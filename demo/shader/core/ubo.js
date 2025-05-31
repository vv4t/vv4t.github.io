"use strict";

import { gl } from "./gl.js";

export class ubo_t {
  constructor(data, binding) {
    this.data = data;
    this.buffer_size = data.reduce((size, field) => size + field.length, 0);
    this.binding = binding;
    this.ubo = gl.createBuffer();

    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, Math.max(this.buffer_size * 4, gl.UNIFORM_BLOCK_DATA_SIZE), gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, binding, this.ubo);
  }

  update() {
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.ubo);
    let offset = 0;
    for (const field of this.data) {
      gl.bufferSubData(gl.UNIFORM_BUFFER, offset * 4, field); 
      offset += field.length;
    }
  }

  attach_shader(shader, name) {
    shader.bind();
    const loc = gl.getUniformBlockIndex(shader.program, name);
    glUniformBlockBinding(shader.program, loc, this.binding);
  }
};
