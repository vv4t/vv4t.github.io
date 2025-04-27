"use strict"

export class vertex_t {
  static VERTEX_ATTRIB = [3, 2];
  static ATTRIB_SIZE = this.VERTEX_ATTRIB.reduce((a,b) => a + b);
  static BYTE_SIZE = this.ATTRIB_SIZE * 4;
  
  constructor(pos, uv) {
    this.pos = pos;
    this.uv = uv;
  }
  
  to_buffer() {
    return [
      this.pos.x,
      this.pos.y,
      this.pos.z,
      this.uv.x,
      this.uv.y
    ];
  }
};
