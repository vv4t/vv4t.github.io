import { GUIElement } from "./guiElement.js";
import { Vector2 } from "../util/math.js";

export class GUILabel extends GUIElement {
  constructor(text, font, offset)
  {
    super(
      offset,
      new Vector2(
        text.length * (font.spriteWidth + 1) + 3,
        font.spriteHeight + 4
      ),
      [ 255, 255, 255, 255 ]
    );
    
    this.font = font;
    this.text = text;
  }
  
  mouseEvent(button, action)
  {
  }
  
  mouseEnter()
  {
  }
  
  mouseExit()
  {
  }
};

