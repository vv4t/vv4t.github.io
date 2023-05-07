import { Entity } from "./baseEntity.js";
import { Vector3 } from "../../util/math.js";
import { AnimationEngine, Animation } from "../../gfx/animation.js";

export class Zombie extends Entity {
    static nodes = []
    
    constructor(pos) {
        super(pos, new Vector3(0.1, 0.1, 1.0), 0);
        
        this.speed = 3;

        const animationStates =  {
            "idle" : new Animation(8, 2, 300),
            "aggro" : new Animation(8, 2, 150)
        } 
        
        this.animation = new AnimationEngine("idle", animationStates)
    
        this.path = []
        this.nextPath = 0;
        
        this.health = 5;
    }
    
    update(delta, game, userCommand) {
        this.followPlayer(delta, game);
        this.animate(game);
    }
    
    animate(game)
    { 
      const distanceFromPlayer = this.pos.copy().sub(game.player.pos).length();
      if (distanceFromPlayer < 4) {
          this.animation.state = "aggro"
      } else {
          this.animation.state = "idle"
      }
      
      this.spriteID = this.animation.getCurrentFrame();
    }
    
    onHit()
    {
      this.health--;
      
      if (this.health < 0)
        this.active = false;
    }
    
    followPlayer(delta, game)
    {
      if (this.nextPath <= 0.0) {
          this.path = game.paths.thetaStar(this.pos, game.player.pos);
          this.nextPath += 0.5;
      } else {
        this.nextPath -= delta;
      }
      
      if (this.path.length != 0) {
          const [nodeX, nodeY] = this.path[0]
          const moveDir = new Vector3(
              (nodeX + 0.5) - this.pos.x,
              (nodeY + 0.5) - this.pos.y,
              0
          );
          
          moveDir.normalize()
                 .mulf(this.speed)
                 .mulf(delta);
          
          this.clipMove(moveDir, game.map);
      }
    }
}
