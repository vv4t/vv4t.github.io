'use strict';

export class display_t {
  constructor(width, height)
  {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement("CANVAS");
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d");
    this.data = this.ctx.getImageData(0, 0, width, height);
    this.data_u8 = new Uint8Array(this.data.data.buffer);
    this.data_u32 = new Uint32Array(this.data_u8);
    
    for (let i = 0; i < this.data_u32.length; i++)
      this.data_u8[i * 4 + 3] = 255;
  }
  
  put_pixel(color, x, y)
  {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height)
      this.data_u32[x + y * this.width] = color;
  }
  
  put_pixel_rgb(color, x, y)
  {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      const i = (x + y * this.width) * 4;
      
      this.data_u8[i + 0] = color[0];
      this.data_u8[i + 1] = color[1];
      this.data_u8[i + 2] = color[2];
    }
  }
  
  get_rgb(x, y)
  {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
      const i = (x + y * this.width) * 4;
      
      return [
        this.data_u8[i + 0],
        this.data_u8[i + 1],
        this.data_u8[i + 2]
      ];
    }
    
    return [ 0, 0, 0 ];
  }
  
  swap()
  {
    this.ctx.putImageData(this.data, 0, 0);
  }
}
