import { Texture, textureLoad } from "./texture.js";
import { fileLoad } from "../util/file.js";

class SpriteMap {
  constructor(spriteArr, spriteWidth, spriteHeight)
  {
    this.spriteArr = spriteArr;
    this.spriteWidth = spriteWidth;
    this.spriteHeight = spriteHeight;
  }
  
  getSprite(id)
  {
    return this.spriteArr[id];
  }
};

export function spriteMapLoad(sprPath, onLoad)
{
  fileLoad("assets/spr/" + sprPath + ".spr", (sprFileText) => {
    const sprFile = JSON.parse(sprFileText);
    const sprTexPath = "assets/spr/" + sprFile.src + ".png";
    
    textureLoad(sprTexPath, (sprTex) => {
      const sprArr = [];
      
      const numRow = Math.floor(sprFile.sprCount / sprFile.columns);
      
      for (let i = 0; i < numRow; i++) {
        for (let j = 0; j < sprFile.columns; j++) {
          const tex = new Texture(sprFile.sprWidth, sprFile.sprHeight);
          
          const xPixel0 = j * sprFile.sprWidth;
          const xPixel1 = (j + 1) * sprFile.sprWidth;
          
          const yPixel0 = i * sprFile.sprHeight;
          const yPixel1 = (i + 1) * sprFile.sprHeight;
          
          let pixID = 0;
          
          for (let yp = yPixel0; yp < yPixel1; yp++) {
            for (let xp = xPixel0; xp < xPixel1; xp++) {
              const [ R, G, B, A ] = sprTex.getRGBA(xp, yp);
              tex.dataU8[pixID + 0] = R;
              tex.dataU8[pixID + 1] = G;
              tex.dataU8[pixID + 2] = B;
              tex.dataU8[pixID + 3] = A;
              pixID += 4;
            }
          }
          
          sprArr.push(tex);
        }
      }
      
      onLoad(new SpriteMap(sprArr, sprFile.sprWidth, sprFile.sprHeight));
    });
  });
}
