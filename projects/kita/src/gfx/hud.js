import { Renderer2D } from "./renderer2D.js";

export class HUD extends Renderer2D {
  constructor(bitmap, hudSpriteMap, font)
  {
    super(bitmap);
    this.font = font;
    this.hudSpriteMap = hudSpriteMap;
    this.isVisible = false;
    
    this.oldRot = 0.0;
  }
  
  render(game)
  {
    if (!this.isVisible)
      return;
    
    this.drawCrossHair();
    this.drawWeapon(game);
    this.drawHealth(game);
    this.drawInfo(game);
  }
  
  drawInfo(game)
  {
    this.drawText(
      "X " + Math.floor(game.player.pos.x).toString() +
      "  Y " + Math.floor(game.player.pos.y).toString(),
      this.font,
      10, 10,
      [ 255, 255, 255, 255 ]
    );
  }
  
  drawHealth(game)
  {
    this.drawText("HP 100", this.font, 10, this.bitmap.height - 12, [ 255, 255, 255, 255 ]);
  }
  
  drawWeapon(game)
  {
    this.oldRot += (game.player.rot - this.oldRot) * 0.1;
    
    const sinMoveInterp = Math.sin(game.player.moveInterp * 5);
    const weapBob = sinMoveInterp * sinMoveInterp * 9;
    
    this.drawTexture(
      this.hudSpriteMap.getSprite(0),
      150 + Math.floor((game.player.rot - this.oldRot) * 10),
      this.bitmap.height - 4 * this.hudSpriteMap.spriteHeight + Math.floor(weapBob),
      4
    );
  }
  
  drawCrossHair()
  {
    this.drawTexture(
      this.hudSpriteMap.getSprite(1),
      (this.bitmap.width - this.hudSpriteMap.spriteWidth) / 2,
      (this.bitmap.height - this.hudSpriteMap.spriteHeight) / 2
    );
  }
};
