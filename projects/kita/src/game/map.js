import { rand } from "../util//math.js";
import { fileLoad } from "../util/file.js";
import { tileSetLoad, TileSet } from "./tileSet.js";

class RayHit {
  constructor(side, dist, xMap, yMap)
  {
    this.side = side;
    this.dist = dist;
    this.xMap = xMap;
    this.yMap = yMap;
  }
};

export class Map {
  
  constructor(tileSet, sky, width, height, walls, props)
  {
    this.tileSet = tileSet;
    this.sky = sky;
    this.width = width;
    this.height = height;
    this.walls = walls;
    this.tiles = new Uint32Array(this.width * this.height);
    this.props = props;
    this.voidTile = 1;
  }
  
  getTile(x, y)
  {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
      return this.voidTile | this.tileSet.getConfig(this.voidTile);
    
    let tile = this.tiles[x + y * this.width];
    tile |= this.tileSet.getConfig(tile & 255);
    
    if (this.walls[x + y * this.width])
      tile |= this.tileSet.getConfig(this.walls[x + y * this.width] & 255);
    
    return tile;
  }
  
  isSolid(x, y)
  {
    return (this.getTile(x, y) & TileSet.SOLID_FLAG) != 0;
  }
  
  isBlock(x, y)
  {
    return (this.getTile(x, y) & TileSet.BLOCK_FLAG) != 0;
  }

  isCorner(x, y) {
    const occupiedX = (
        this.isSolid(x+1, y) && 
        this.isSolid(x, y) && 
        this.isSolid(x-1, y)
    );
    const occupiedY = (
        this.isSolid(x, y+1) && 
        this.isSolid(x, y) && 
        this.isSolid(x, y-1)
    );
    return !(occupiedX || occupiedY);
  }
  
  collide(xPos, yPos, xBox, yBox)
  {
    const x0 = Math.floor(xPos - xBox);
    const x1 = Math.floor(xPos + xBox);
    const y0 = Math.floor(yPos - yBox);
    const y1 = Math.floor(yPos + yBox);
    
    return (
      this.isSolid(x0, y0) ||
      this.isSolid(x1, y0) ||
      this.isSolid(x0, y1) ||
      this.isSolid(x1, y1)
    )
  }
  
  // Cast a ray from a position in a certain direction and return the first wall it hits
  // TODO: some sort of distance limiter
  rayCast(rayPos, rayDir, hitMask)
  {
    const xDeltaDist = Math.abs(1.0 / rayDir.x);
    const yDeltaDist = Math.abs(1.0 / rayDir.y);
    
    let xMap = Math.floor(rayPos.x);
    let yMap = Math.floor(rayPos.y);
    
    let xStep, yStep;
    let xSideDist, ySideDist;
    
    if (rayDir.x < 0) {
      xSideDist = (rayPos.x - xMap) * xDeltaDist;
      xStep = -1;
    } else {
      xSideDist = (xMap + 1 - rayPos.x) * xDeltaDist;
      xStep = 1;
    }
    
    if (rayDir.y < 0) {
      ySideDist = (rayPos.y - yMap) * yDeltaDist;
      yStep = -1;
    } else {
      ySideDist = (yMap + 1 - rayPos.y) * yDeltaDist;
      yStep = 1;
    }
    
    let side = false;
    while ((this.getTile(xMap, yMap) & hitMask) == 0) {
      if (xSideDist < ySideDist) {
        xSideDist += xDeltaDist;
        xMap += xStep;
        side = true;
      } else {
        ySideDist += yDeltaDist;
        yMap += yStep;
        side = false;
      }
    }
    
    if (side)
      return new RayHit(side, xSideDist - xDeltaDist, xMap, yMap);
    else
      return new RayHit(side, ySideDist - yDeltaDist, xMap, yMap);
  }
}

export function mapLoad(mapPath, onLoad)
{
  fileLoad("assets/map/" + mapPath + ".map", (mapFileText) => {
    const mapFile = JSON.parse(mapFileText);
    tileSetLoad(mapFile.ts, (tileSet) => {
      const map = new Map(
        tileSet,
        mapFile.sky,
        mapFile.width,
        mapFile.height,
        mapFile.walls,
        mapFile.props);
      
      for (let i = 0; i < mapFile.width * mapFile.height; i++)
        map.tiles[i] = mapFile.data[i];
      
      onLoad(map);
    });
  });
}
