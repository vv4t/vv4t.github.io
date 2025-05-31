"use strict";

import { gl } from "./gl.js";

export class cubemap_t {
  constructor(faces) {
    this.cubemap = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubemap);

    for (let i = 0; i < 6; i++) {
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        faces[i]
      );
    }
      
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  
  bind(i) {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubemap);
  }

  destroy() {
    gl.deleteTexture(this.texture);
  }
}
