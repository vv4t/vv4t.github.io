import { fileLoad } from "../util/file.js";
import { spriteMapLoad } from "../gfx/spriteMap.js";

export class TileSet {
  static FLIPPED_HORIZONTALLY_FLAG  = 0x80000000;
  static FLIPPED_VERTICALLY_FLAG    = 0x40000000;
  static FLIPPED_DIAGONALLY_FLAG    = 0x20000000;
  static SOLID_FLAG                 = 0x10000000;
  static BLOCK_FLAG                 = 0x08000000;
  
  constructor(spriteMap, tileConfig)
  {
    this.spriteMap = spriteMap;
    this.tileConfig = tileConfig;
  }
  
  getConfig(tileID)
  {
    if (!this.tileConfig[tileID])
      return 0;
    return this.tileConfig[tileID];
  }
};

export function tileSetLoad(tsPath, onLoad)
{
  fileLoad("assets/ts/" + tsPath + ".ts", (tsFileText) => {
    const tsFile = JSON.parse(tsFileText);
    
    spriteMapLoad(tsFile.spr, (spriteMap) => {
      onLoad(new TileSet(spriteMap, tsFile.tsConfig));
    });
  });
}
