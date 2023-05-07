import { clamp, Vector2 } from "../util/math.js";

const ALPHA_BEGIN = "a".charCodeAt(0);
const ALPHA_END = "z".charCodeAt(0);
const NUM_BEGIN = "0".charCodeAt(0);
const NUM_END = "9".charCodeAt(0);

export class Renderer2D {
  constructor(bitmap)
  {
    this.bitmap = bitmap;
  }
  
  drawRect(xStart, yStart, width, height, color)
  {
    const xEnd = xStart + width - 1;
    const yEnd = yStart + height - 1;
    
    for (let y = yStart; y <= yEnd; y++) {
      this.putRGBA(xStart, y, color[0], color[1], color[2], color[3]);
      this.putRGBA(xEnd, y, color[0], color[1], color[2], color[3]);
    }
    
    for (let x = xStart + 1; x < xEnd; x++) {
      this.putRGBA(x, yStart, color[0], color[1], color[2], color[3]);
      this.putRGBA(x, yEnd, color[0], color[1], color[2], color[3]);
    }
  }
  
  drawText(text, font, xOffset, yOffset, color)
  {
    const lowerText = text.toLowerCase();
    
    for (let i = 0; i < lowerText.length; i++) {
      const charASCII = lowerText.charCodeAt(i);
      
      let spriteID = 0;
      
      if (charASCII >= ALPHA_BEGIN && charASCII <= ALPHA_END)
        spriteID = charASCII - ALPHA_BEGIN;
      else if (charASCII >= NUM_BEGIN && charASCII <= NUM_END)
        spriteID = 26 + charASCII - NUM_BEGIN;
      
      else if (lowerText[i] == ".")
        spriteID = 36;
      else if (lowerText[i] == "?")
        spriteID = 37;
      else if (lowerText[i] == "!")
        spriteID = 38;
      else if (lowerText[i] == " ")
        continue;
      
      const texChar = font.getSprite(spriteID);
      this.drawTextureShade(texChar, i * (texChar.width + 1) + xOffset, yOffset, color);
    }
  }
  
  drawTextureShade(texture, xOffset, yOffset, color)
  {
    for (let y = 0; y < texture.height; y++) {
      const yPixel = yOffset + y;
      
      for (let x = 0; x < texture.width; x++) {
        const xPixel = xOffset + x;
        
        const [ R, G, B, A ] = texture.getRGBA(x, y);
        this.putRGBAShade(xPixel, yPixel, R, G, B, A, color);
      }
    }
  }
  
  drawTexture(texture, xOffset, yOffset, size=1)
  {
    for (let y = 0; y < texture.height; y++) {
      for (let yp = 0; yp < size; yp++) {
        const yPixel = yOffset + y * size + yp;
      
        for (let x = 0; x < texture.width; x++) {
          for (let xp = 0; xp < size; xp++) {
            const xPixel = xOffset + x * size + xp;
            
            const [ R, G, B, A ] = texture.getRGBA(x, y);
            this.putRGBA(xPixel, yPixel, R, G, B, A);
          }
        }
      }
    }
  }
  
  putRGBAShade(x, y, R, G, B, A, color)
  {
    const colorR = clamp(R * color[0] / 255.0, 0, 255);
    const colorG = clamp(G * color[1] / 255.0, 0, 255);
    const colorB = clamp(B * color[2] / 255.0, 0, 255);
    const colorA = clamp(A * color[3] / 255.0, 0, 255);
    
    this.putRGBA(
      x, y,
      colorR,
      colorG,
      colorB,
      colorA);
  }
  
  putRGBA(x, y, R, G, B, A)
  {
    if (A == 0)
      return;
    
    if (A == 255) {
      this.bitmap.putRGB(x, y, R, G, B, A);
    } else {
      const [ bgR, bgG, bgB ] = this.bitmap.getRGB(x, y);
      
      const dR = R - bgR;
      const dG = G - bgG;
      const dB = B - bgB;
      
      const lerp = A / 255.0;
      
      const shadeR = Math.floor(bgR + dR * lerp);
      const shadeG = Math.floor(bgG + dG * lerp);
      const shadeB = Math.floor(bgB + dB * lerp);
      
      this.bitmap.putRGB(x, y, shadeR, shadeG, shadeB);
    }
  }
}
