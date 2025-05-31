"use strict";

import { gl } from "./gl.js";

class mesh_t {
  constructor(offset, num_vertices)
  {
    this.offset = offset;
    this.num_vertices = num_vertices;
  }
  
  draw() {
    gl.drawArrays(
      gl.TRIANGLES,
      this.offset,
      this.num_vertices
    );
  }
  
  sub_draw(offset, count) {
    gl.drawArrays(
      gl.TRIANGLES,
      this.offset + offset,
      count
    );
  }
}

export class mesh_buffer_t {
  constructor(attributes, max_vertices) {
    this.max_vertices = max_vertices;
    this.vertex_size = attributes.reduce((a, b) => a + b);
    this.top = 0;
    
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, max_vertices * this.vertex_size * 4, gl.STATIC_DRAW);
    
    let offset = 0;
    
    for (let i = 0; i < attributes.length; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, attributes[i], gl.FLOAT, false, this.vertex_size * 4, offset);
      offset += this.vertex_size * 4;
    }
  }
  
  bind() {
    gl.bindVertexArray(this.vao);
  }
  
  push(data) {
    const count = data.length / this.vertex_size;
    const mesh = this.allocate(count);
    this.put(mesh, 0, data);
    return mesh;
  }
  
  allocate(num_vertices) {
    const offset = this.top;
    if (this.top + num_vertices > this.max_vertices )
      throw "ran out of memory";
      
    this.top += num_vertices;
    
    return new mesh_t(offset, num_vertices);
  }
  
  reset(top) {
    this.top = top;
  }

  put(mesh, offset, data) {
    const count = data.length / this.vertex_size;
    if (mesh.offset + offset + count > this.max_vertices)
      throw "too many vertices";
    
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      (mesh.offset + offset) * this.vertex_size * 4,
      data
    );
  }
};
