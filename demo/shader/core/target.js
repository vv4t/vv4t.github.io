"use strict";

import { gl } from "./gl.js";

export class target_t {
  constructor(bindings) {
    if (bindings.length == 0) {
      this.framebuffer = null;
      return;
    }

    this.framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    
    const buffers = [];
    for (const binding of bindings) {
      if (binding[0] != gl.DEPTH_ATTACHMENT) {
        buffers.push(binding[0]);
      }
      
      gl.framebufferTexture2D(gl.FRAMEBUFFER, binding[0], gl.TEXTURE_2D, binding[1].texture, 0);
    }
    
    gl.drawBuffers(buffers);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  bind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
  }

  unbind() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
};
