"use strict";

import { gl } from "./display.js";

function compile_shader(type, src)
{
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    throw "could not compile WebGL program\n\n" + info;
  }
  
  return shader;
}

export class shader_t {
  constructor(src_vertex, src_fragment) {
    const vertex_shader = compile_shader(gl.VERTEX_SHADER, src_vertex);
    const fragment_shader = compile_shader(gl.FRAGMENT_SHADER, src_fragment);
    
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertex_shader);
    gl.attachShader(this.program, fragment_shader);
    gl.linkProgram(this.program);
    
    gl.detachShader(this.program, vertex_shader);
    gl.detachShader(this.program, fragment_shader);
    gl.deleteShader(vertex_shader);
    gl.deleteShader(fragment_shader);
  }
  
  get_uniform_location(name) {
    return gl.getUniformLocation(this.program, name);
  }
  
  bind() {
    gl.useProgram(this.program);
  }
}
