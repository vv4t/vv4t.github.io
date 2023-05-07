export class GUIElement {
  constructor(offset, size, color)
  {
    if (this.constructor == GUIElement) 
      throw new Error("Abstract base class GUIElement can not be instantiated.")
    
    this.offset = offset;
    this.size = size;
    this.color = color;
    
    this.inBound = false;
  }
  
  mouseEvent(button, action)
  {
    throw new Error("No mouseClick method implemented.")
  }
  
  mouseEnter()
  {
    throw new Error("No mouseEnter method implemented.")
  }
  
  mouseExit()
  {
    throw new Error("No mouseExit method implemented.")
  }
};

