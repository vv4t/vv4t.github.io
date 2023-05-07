export class Entity {
  constructor(pos, size, spriteID) {
    if (this.constructor == Entity) 
      throw new Error("Abstract base class Entity can not be instantiated.")

    this.pos = pos;
    this.size = size;
    
    this.active = true;
    
    this.spriteID = spriteID; //if spriteID == -1, there is no sprite !
  }

  update() {
    throw new Error("No update method implemented.")
  }

  clipMove(step, map)
  {
    const newPosX = this.pos.x + step.x;
    const newPosY = this.pos.y + step.y;
    
    if (map.collide(newPosX, newPosY, this.size.x, this.size.y)) {
      if (!map.collide(this.pos.x, newPosY, this.size.x, this.size.y))
        this.pos.y = newPosY;
      else if (!map.collide(newPosX, this.pos.y, this.size.x, this.size.y))
        this.pos.x = newPosX;
    } else {
      this.pos.x = newPosX;
      this.pos.y = newPosY;
    }
  }
}
