"use strict";

import { gl } from "./display.js";
import { vertex_t } from "./vertex.js";

function vertices_to_array_buffer(vertices) {
  const float_array = new Float32Array(vertices.length * vertex_t.ATTRIB_SIZE);
  
  for (let i = 0; i < vertices.length; i++) {
    const data = vertices[i].to_buffer();
    
    for (let j = 0; j < data.length; j++) {
      float_array[i * vertex_t.ATTRIB_SIZE + j] = data[j];
    }
  }
  
  return float_array;
}

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
  constructor(max_vertices) {
    this.max_vertices = max_vertices;
    this.top_ptr = 0;
    
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, max_vertices * vertex_t.BYTE_SIZE, gl.STATIC_DRAW);
    
    let offset = 0;
    
    for (let i = 0; i < vertex_t.VERTEX_ATTRIB.length; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, vertex_t.VERTEX_ATTRIB[i], gl.FLOAT, false, vertex_t.BYTE_SIZE, offset);
      offset += vertex_t.VERTEX_ATTRIB[i] * 4;
    }
  }
  
  bind() {
    gl.bindVertexArray(this.vao);
  }
  
  push(vertices) {
    const mesh = this.allocate(vertices.length);
    this.put(mesh, 0, vertices);
    return mesh;
  }
  
  allocate(num_vertices) {
    const offset = this.top_ptr;
    
    if (this.top_ptr + num_vertices >= this.max_vertices )
      throw "ran out of memory";
      
    this.top_ptr += num_vertices;
    
    return new mesh_t(offset, num_vertices);
  }
  
  reset(top_ptr) {
    this.top_ptr = top_ptr;
  }

  put(mesh, offset, vertices) {
    if (mesh.offset + offset + vertices.length > this.max_vertices)
      throw "too many vertices";
    
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      (mesh.offset + offset) * vertex_t.BYTE_SIZE,
      vertices_to_array_buffer(vertices)
    );
  }
};
