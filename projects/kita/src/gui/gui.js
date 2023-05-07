import { Vector2 } from "../util/math.js";
import { GUIButton } from "./guiButton.js";
import { GUILabel } from "./guiLabel.js";

export class GUI {
  constructor(bitmap, font)
  {
    this.bitmap = bitmap;
    this.font = font;
    
    this.mousePos = new Vector2(0.0, 0.0);
    this.mouseSensitivity = 0.25;
    this.isActive = false;
    
    this.elements = [];
  }
  
  unload()
  {
    this.elements = [];
  }
  
  addButton(text, onClick, offset, size)
  {
    const newButton = new GUIButton(text, this.font, onClick, offset, size);
    this.elements.push(newButton);
    return newButton;
  }
  
  addLabel(text, offset)
  {
    const newLabel = new GUILabel(text, this.font, offset);
    this.elements.push(newLabel);
    return newLabel;
  }
  
  keyEvent(key, action)
  {
    if (!this.isActive)
      return false;
  }
  
  mouseEvent(button, action)
  {
    if (!this.isActive)
      return;
    
    for (const element of this.elements) {
      if (boxBoundsPos(this.mousePos, element.offset, element.size))
        element.mouseEvent(button, action);
    }
  }
  
  mouseMove(xMovement, yMovement)
  {
    if (!this.isActive)
      return;
    
    for (const element of this.elements) {
      const inBound = boxBoundsPos(this.mousePos, element.offset, element.size);
      
      if (inBound && !element.inBound) {
        element.mouseEnter();
        element.inBound = true;
      }
      
      if (!inBound && element.inBound) {
        element.mouseExit();
        element.inBound = false;
      }
    }
    
    const newPos = this.mousePos.copy().add(new Vector2(xMovement, yMovement).mulf(this.mouseSensitivity));
    
    if (newPos.x > 0 && newPos.x < this.bitmap.width)
      this.mousePos.x = newPos.x;
    
    if (newPos.y > 0 && newPos.y < this.bitmap.height)
      this.mousePos.y = newPos.y;
  }
  
  setActive(isActive)
  {
    this.isActive = isActive;
  }
};

function boxBoundsPos(pos, boxPos, boxSize)
{
  return pos.x >= boxPos.x
  && pos.y >= boxPos.y
  && pos.x <= boxPos.x + boxSize.x
  && pos.y <= boxPos.y + boxSize.y;
}
