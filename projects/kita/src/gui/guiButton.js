import { GUIElement } from "./guiElement.js";
import { Vector2, } from "../util/math.js";

export class GUIButton extends GUIElement {
  constructor(text, font, onClick, offset, size)
  {
    super(offset, size, [255, 255, 255, 255]);
    
    this.text = text;
    this.font = font;
    this.onClick = onClick;
    this.clickDown = false;
    
    const textWidth = text.length * (font.spriteWidth + 1);
    const textHeight = font.spriteHeight;
    
    this.textOffset = size.copy().sub(new Vector2(textWidth, textHeight)).mulf(0.5);
  }
  
  mouseEvent(button, action)
  {
    if (!this.clickDown && action)
      this.clickDown = true;
      
    if (this.clickDown && !action) {
      this.clickDown = false;
      this.onClick();
    }
  }
  
  mouseEnter()
  {
    this.color = [150, 150, 150, 255];
  }
  
  mouseExit()
  {
    this.color = [255, 255, 255, 255];
  }
};

