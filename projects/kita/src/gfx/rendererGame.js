import { Renderer3D } from "./renderer3D.js";
import { textureLoad } from "./texture.js";
import { clamp, Vector3 } from "../util/math.js";
import { spriteMapLoad } from "../gfx/spriteMap.js";
import { TileSet } from "../game/tileSet.js";

class MapWall {
  constructor(start, end, tex)
  {
    this.start = start;
    this.end = end;
    this.tex = tex;
  }
};

class Camera {
  constructor(pos, rot, fov)
  {
    this.pos = pos;
    this.rot = rot;
    this.fov = fov;
  }
};

export class RendererGame extends Renderer3D {
  constructor(bitmap, entitySpriteMap)
  {
    super(bitmap);
    
    this.camera = new Camera(new Vector3(0.0, 0.0, 0.0), 0.0, 2.0);
    
    this.map = null;
    this.mapSky = null;
    this.mapWalls = [];
    
    this.entitySpriteMap = entitySpriteMap;
  }
  
  render(game)
  {
    this.lockCamera(game.player);
    this.renderMap();
    this.renderEntities(game.entities);
  }
  
  lockCamera(entity)
  {
    this.camera.pos = entity.pos;
    this.camera.rot = entity.rot;
  }
  
  renderMap()
  {
    if (!this.map)
      return;
    
    this.renderMapData(this.map);
    
    for (const mapWall of this.mapWalls)
      this.renderWall(mapWall.tex, mapWall.start, mapWall.end);
    
    for (const prop of this.map.props) {
      this.renderSprite(
        this.map.tileSet.spriteMap.getSprite(prop.spriteID),
        new Vector3(prop.xPos, prop.yPos, prop.height * 0.5 - 0.5),
        prop.width,
        prop.height
      );
    }
  }
  
  renderEntities(entities)
  {
    if (!this.entitySpriteMap)
      return;
    
    for (const entity of entities) {
      if (entity.spriteID == -1 || !entity.active)
        continue;
      
      this.renderSprite(this.entitySpriteMap.getSprite(entity.spriteID), entity.pos);
    }
  }
  
  mapLoad(map)
  {
    this.map = map;
    this.mapWalls = [];
    
    for (const [posID, wall] of Object.entries(map.walls)) {
      const xPos = posID % map.width;
      const yPos = Math.floor(posID / map.width);
      
      let start;
      let end;
      
      if (wall & TileSet.FLIPPED_DIAGONALLY_FLAG) {
        start = new Vector3(-0.5, -0.5, 0.0);
        end = new Vector3(-0.5, +0.5, 0.0);
        
        if (wall & TileSet.FLIPPED_HORIZONTALLY_FLAG) {
          start.x = -start.x;
          end.x = -end.x;
        }
      } else {
        start = new Vector3(-0.5, -0.5, 0.0);
        end = new Vector3(+0.5, -0.5, 0.0);
        
        if (wall & TileSet.FLIPPED_VERTICALLY_FLAG) {
          start.y = -start.y;
          end.y = -end.y;
        }
      }
      
      start.add(new Vector3(xPos + 0.5, yPos + 0.5, 0.0));
      end.add(new Vector3(xPos + 0.5, yPos + 0.5, 0.0));
      
      const tex = map.tileSet.spriteMap.getSprite((wall & 255) - 1);
      this.mapWalls.push(new MapWall(start, end, tex));
    }
    
    if (map.sky) {
      textureLoad("assets/sky/" + map.sky + ".png", (mapSky) => {
        this.mapSky = mapSky;
      });
    }
  }
};
