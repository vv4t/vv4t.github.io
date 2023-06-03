import { gl } from "./gl.js";

export class shader_t
{
  constructor()
  {
    const vs_src = `  
attribute vec3 a_pos;
attribute vec2 a_uv;

varying highp vec2 vs_uv;

uniform mat4 u_mvp;

void main()
{
  vs_uv = a_uv;
  gl_Position = u_mvp * vec4(a_pos, 1.0);
}
    `;
    
    const fs_src = `
precision mediump float;

varying highp vec2 vs_uv;

uniform sampler2D u_sampler;
uniform float     u_opacity;

void main()
{
  gl_FragColor = texture2D(u_sampler, vs_uv) * vec4(1.0, 1.0, 1.0, u_opacity);
}
    `;
    
    this.program = shader_load(gl, vs_src, fs_src);
    this.ul_mvp = gl.getUniformLocation(this.program, "u_mvp");
    this.ul_sampler = gl.getUniformLocation(this.program, "u_sampler");
    this.ul_opacity = gl.getUniformLocation(this.program, "u_opacity");
    
    gl.useProgram(this.program);
    gl.uniform1i(this.ul_sampler, 0);
  }
  
  bind()
  {
    gl.useProgram(this.program);
  }
  
  set_opacity(opacity)
  {
    gl.uniform1f(this.ul_opacity, opacity);
  };
  
  set_mvp(m)
  {
    gl.uniformMatrix4fv(this.ul_mvp, false, m.m);
  };
}

function shader_load(gl, vs_src, fs_src)
{
  const vertex_shader = compile_shader(gl, vs_src, gl.VERTEX_SHADER);
  const fragment_shader = compile_shader(gl, fs_src, gl.FRAGMENT_SHADER);
  
  const program = gl.createProgram();
  
  gl.attachShader(program, vertex_shader);
  gl.attachShader(program, fragment_shader);
  
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log("unable to initialize shader program");
    return;
  }
  
  return program;
}

function compile_shader(gl, src, type)
{
  const shader = gl.createShader(type);
  
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log("error compiling shader:", gl.getShaderInfoLog(shader));
    return;
  }
  
  return shader;
}
