
export class Texture {
  constructor(width, height)
  {
    this.width = width;
    this.height = height;
    this.dataU8 = new Uint8Array(this.width * this.height * 4);
  }
  
  getRGBA(x, y)
  {
    if (x < 0)
      x = 0;
    if (y < 0)
      y = 0;
    if (x >= this.width)
      x = this.width - 1;
    if (y >= this.height)
      y = this.height - 1;
    
    const i = (x + y * this.width) * 4;
    
    return [
      this.dataU8[i + 0],
      this.dataU8[i + 1],
      this.dataU8[i + 2],
      this.dataU8[i + 3]
    ];
  }
};

export function textureLoad(path, onLoad)
{
  const img = new Image();
  img.src = path;
  
  img.onload = function() {
    const texture = new Texture(img.width, img.height);
    
    const canvas = document.createElement("CANVAS");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height);
    const dataBuffer = new Uint8Array(data.data.buffer);
    
    for (let i = 0; i < texture.width * texture.height * 4; i++)
      texture.dataU8[i] = dataBuffer[i];
    
    onLoad(texture);
  };
}
