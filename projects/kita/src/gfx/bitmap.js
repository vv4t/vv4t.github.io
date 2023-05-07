"use strict";

export class Bitmap {
  constructor(width, height)
  {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement("CANVAS");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = width;
    this.canvas.height = height;
    this.data = this.ctx.getImageData(0, 0, width, height);
    this.dataU8 = new Uint8Array(this.data.data.buffer);
    
    for (let i = 0; i < this.dataU8.length; i += 4)
      this.dataU8[i + 3] = 255;
  }
  
  putRGB(x, y, r, g, b)
  {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
      return;
    
    const i = (x + y * this.width) * 4;
    
    this.dataU8[i + 0] = r;
    this.dataU8[i + 1] = g;
    this.dataU8[i + 2] = b;
  }
  
  getRGB(x, y)
  {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
      return [ 0, 0, 0 ];
    
    const i = (x + y * this.width) * 4;
    
    return [
      this.dataU8[i + 0],
      this.dataU8[i + 1],
      this.dataU8[i + 2]
    ];
  }
  
  swap()
  {
    this.ctx.putImageData(this.data, 0, 0);
  }
};
