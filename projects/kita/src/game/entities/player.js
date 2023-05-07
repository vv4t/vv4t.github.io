import { Vector3 } from "../../util/math.js";
import { Zombie } from "./zombie.js";
import { Entity } from "./baseEntity.js";

export class Player extends Entity {
  constructor(pos, rot)
  {
    super(pos, new Vector3(0.1, 0.1, 1.0), -1); // arbitary spriteID -1 indicates no sprite !! mayb put in a constant or something

    this.moveSpeed = 4.0;
    this.moveInterp = 0.0;
    
    this.nextFire = 0.0;
    
    this.lookSensitivity = 0.005;
    
    this.rot = rot;
  }
  
  update(delta, game, userCommand) {
    this.rot += userCommand.deltaRot * this.lookSensitivity;
    
    this.bob();
    this.move(delta, game.map, userCommand);
    this.attack(delta, game, userCommand);
  }
  
  attack(delta, game, userCommand)
  {
    if (this.nextFire > 0.0)
      this.nextFire -= delta;
    
    if (userCommand.attack1 && this.nextFire <= 0.0) {
      const rayDir = new Vector3(0.0, 1.0, 0.0).rotateZ(this.rot);
      const rayHit = game.rayCast(this.pos.copy().add(rayDir), rayDir);
      
      if (rayHit) {
        if (rayHit.constructor == Zombie)
          rayHit.onHit();
      }
      
      this.nextFire = 0.1;
    }
  }
  
  bob()
  {
    this.pos.z = 0.1 + Math.cos(this.moveInterp * 10) * 0.03;
  }

  move(delta, map, userCommand)
  {
    if (userCommand.side || userCommand.forward) {
      const moveDir = new Vector3(userCommand.side, userCommand.forward, 0.0);
      moveDir.rotateZ(this.rot);
      moveDir.normalize();
      moveDir.mulf(this.moveSpeed * delta);
      
      this.clipMove(moveDir, map);
      
      this.moveInterp += delta;
    } else {
      this.moveInterp = 0.0;
    }
  }
};
