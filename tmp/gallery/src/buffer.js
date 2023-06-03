import { gl } from "./gl.js";

export class vertex_t {
  static size = 20;
  
  constructor(pos, u, v)
  {
    this.pos = pos;
    this.u = u;
    this.v = v;
  }
};

export class buffer_t
{
  constructor(program)
  {
    this.num_vertices = 0;
    this.init_array_buffer(program);
  }
  
  init_array_buffer(program)
  {
    const buffer = gl.createBuffer();
    
    if (!buffer) {
      console.log("failed to create buffer object");
      return;
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, 1024*1024, gl.STATIC_DRAW);
    
    const a_pos = gl.getAttribLocation(program, "a_pos");
    const a_uv = gl.getAttribLocation(program, "a_uv");
    
    gl.vertexAttribPointer(a_pos, 3, gl.FLOAT, false, 20, 0);
    gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 20, 12);
    gl.enableVertexAttribArray(a_pos);
    gl.enableVertexAttribArray(a_uv);
  }
  
  new_mesh(vertices)
  {
    const offset = this.num_vertices;
    
    const float_array = [];
    for (const vertex of vertices) {
      float_array.push(vertex.pos.x);
      float_array.push(vertex.pos.y);
      float_array.push(vertex.pos.z);
      float_array.push(vertex.u);
      float_array.push(vertex.v);
    }
    
    gl.bufferSubData(gl.ARRAY_BUFFER, offset * vertex_t.size, new Float32Array(float_array));
    
    this.num_vertices += vertices.length;
    
    return {
      offset: offset,
      count: vertices.length
    };
  }
}
