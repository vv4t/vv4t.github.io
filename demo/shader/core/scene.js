"use strict";

import { initGL, gl } from "./gl.js";
import { ubo_t } from "./ubo.js";
import { loader_t } from "./loader.js";
import { cubemap_t } from "./cubemap.js";
import { shader_t } from "./shader.js";
import { target_t } from "./target.js";
import { mesh_buffer_t } from "./mesh.js";
import { create_image, create_buffer } from "./texture.js";

const vertex_shader = `
#version 300 es
layout(location = 0) in vec2 vertex;

void main() {
  gl_Position = vec4(vertex, 0.0, 1.0);
}
`.trim();

export class scene_t {
  constructor(canvas) {
    initGL(canvas);
    
    this.canvas = canvas;
    this.loader = new loader_t();
    this.mesh_buffer = new mesh_buffer_t([2], 6);
    this.quad = this.mesh_buffer.push(new Float32Array([
      -1, -1,
      -1, +1,
      +1, -1,
      +1, -1,
      +1, +1,
      -1, +1,
    ]));
    this.buffers = [];
    this.shaders = [];
    this.passes = [];
    this.data = [];
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
  }

  async load_image(path) {
    const data = await this.loader.load_image(path);
    const image = create_image(data);
    const id = this.buffers.push(image) - 1;
    return id;
  }

  add_buffer(width, height) {
    const buffer = create_buffer(width, height, gl.RGBA, gl.RGBA32F, gl.FLOAT);
    const id = this.buffers.push(buffer) - 1;
    return id;
  }

  async load_shader(path, channels) {
    const fragment_shader = [
      "#version 300 es",
      "precision mediump float;",
      ...await load_shader_contents(this.loader, path)
    ].join("\n");

    const shader = new shader_t(vertex_shader, fragment_shader);
    const id = this.shaders.push(shader) - 1;

    shader.bind();
    for (let i = 0; i < channels.length; i++) {
      const loc = gl.getUniformLocation(shader.program, channels[i]);
      gl.uniform1i(loc, i);
    }

    for (const [name, ubo] of this.data) {
      ubo.attach_shader(shader, name);
    }
    
    return id;
  }

  async load_cubemap(base, ext) {
    const faces = ["rt", "lf", "up", "dn", "ft", "bk"];
    const images = await Promise.all(faces.map(async (face) => await this.loader.load_image(`${base}/${face}.${ext}`)));
    const cubemap = new cubemap_t(images);
    const id = this.buffers.push(cubemap) - 1;
    return id;
  }

  add_data(name, fields) {
    const data = new ubo_t(fields, this.data.length);
    const id = this.data.push([name, data]) - 1;
    return id;
  }

  add_pass(input, shader, output) {
    const pass = new pass_t(
      input.map((input) => this.buffers[input]),
      this.shaders[shader],
      output.map((output) => this.buffers[output]),
      this.canvas.width,
      this.canvas.height
    );
    this.passes.push(pass);
  }

  render() {
    for (const [name, data] of this.data) {
      data.update();
    }

    for (const pass of this.passes) {
      pass.bind();
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.quad.draw();
    }
  }
};

class pass_t {
  constructor(input, shader, output, width, height) {
    const bindings = output.map((buffer, i) => [ gl.COLOR_ATTACHMENT0 + i, buffer ]);
    this.width = output.length > 0 ? Math.max(output.map((buffer) => buffer.width)) : width;
    this.height = output.length > 0 ? Math.max(output.map((buffer) => buffer.height)) : height;
    this.input = input;
    this.shader = shader;
    this.target = new target_t(bindings);
  }

  bind() {
    gl.viewport(0, 0, this.width, this.height);
    
    for (let i = 0; i < this.input.length; i++)
      this.input[i].bind(i);
    
    this.shader.bind();
    this.target.bind();
  }
};

async function load_shader_contents(loader, path) {
  const shader = await loader.load_file(path);
  const base = ["."].concat(path.split("/").slice(0, -1)).join("/");

  const lines = [];
  for (const line of shader.split("\n")) {
    const match_use = new RegExp("#include \"(.+)\"").exec(line);
    if (match_use) {
      const use_file = base + "/" + match_use[1];
      const content = await load_shader_contents(loader, use_file);
      lines.push(...content);
    } else {
      lines.push(line);
    }
  }

  return lines;
}
