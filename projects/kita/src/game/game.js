import { mapLoad } from "./map.js";
import { Paths } from "./paths.js";
import { Player } from "./entities/player.js";
import { Vector3 } from "../util/math.js";
import { TileSet } from "./tileSet.js";

export class UserCommand {
  constructor(side, forward, attack1, deltaRot)
  {
    this.side = side;
    this.forward = forward;
    this.attack1 = attack1;
    this.deltaRot = deltaRot;
  }
}

export class Game {
  constructor()
  {
    this.map = null;
    this.paths = null;
    
    this.time = 0.0;
    
    this.entities = [];
    this.player = new Player(new Vector3(3.0, 3.0, 0.2), 0.0);
    this.entities.push(this.player);

    this.events = {};
    this.events["mapLoad"] = [];
  }
  
  update(delta, userCommand)
  {
    if (!this.map)
      return;
    
    this.time += delta;
    
    for (const entity of this.entities) {
      if (!entity.active)
        continue;
      entity.update(delta, this, userCommand);
    }
  }
  
  rayCast(pos, dir)
  {
    const wallHit = this.map.rayCast(pos, dir, TileSet.SOLID_FLAG);
    
    let hitEntity = null;
    let hitDist = 10000;
    
    for (const entity of this.entities) {
      if (!entity.active)
        continue;
      
      const deltaPos = pos.copy().sub(entity.pos);
      
      const planeNormal = deltaPos.normalize();
      const planeDistance = entity.pos.dot(planeNormal);
      
      const t = -(pos.dot(planeNormal) - planeDistance) / dir.dot(planeNormal);
      const hitDir = pos.copy().add(dir.copy().mulf(t)).sub(entity.pos);
      
      if (t <= 0)
        continue;
      
      const hitRange = hitDir.dot(hitDir);
      const entityRange = Math.max(entity.size.x, entity.size.y);
      
      if (t < wallHit.dist && t < hitDist && hitRange < 0.5) {
        hitEntity = entity;
        hitDist = t;
      }
    }
    
    return hitEntity;
  }
  
  addEventListener(eventName, action)
  {
    switch (eventName) {
    case "mapLoad":
      this.events["mapLoad"].push(action);
      break;
    }
  }
  
  unload()
  {
    this.entities = [];
    this.entities.push(this.player);
  }
  
  mapLoad(mapName)
  {
    mapLoad(mapName, (map) => {
      this.map = map;
      this.paths = new Paths(map);
      
      for (const action of this.events["mapLoad"])
        action(map);
    });
  }
};
