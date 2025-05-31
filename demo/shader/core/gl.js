"use strict"

export let gl;

export function initGL(canvas) {
  gl = canvas.getContext("webgl2");
  
  const ext = gl.getExtension("EXT_color_buffer_float");
  if (!ext) {
    alert("need EXT_color_buffer_float");
    return;
  }
}
