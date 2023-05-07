import { Renderer2D } from "./renderer2D.js";

export class RendererGUI extends Renderer2D {
  constructor(bitmap)
  {
    super(bitmap);
  }
  
  render(gui)
  {
    if (!gui.isActive)
      return;
    
    for (const element of gui.elements) {
      switch (element.constructor.name) {
      case "GUILabel":
        this.drawLabel(element);
        break;
      case "GUIButton":
        this.drawButton(element);
        break;
      }
    }
    
    this.drawMouse(gui.mousePos);
  }
  
  drawMouse(mousePos)
  {
    this.drawRect(
      Math.floor(mousePos.x),
      Math.floor(mousePos.y),
      2, 2,
      [ 255, 255, 255, 255 ]);
  }
  
  drawButton(element)
  {
    this.drawText(
      element.text,
      element.font,
      Math.floor(element.offset.x + element.textOffset.x),
      Math.floor(element.offset.y + element.textOffset.y),
      element.color);
    
    this.drawRect(
      Math.floor(element.offset.x),
      Math.floor(element.offset.y),
      Math.floor(element.size.x),
      Math.floor(element.size.y),
      element.color);
  }
  
  drawLabel(element)
  {
    this.drawText(
      element.text,
      element.font,
      Math.floor(element.offset.x),
      Math.floor(element.offset.y),
      element.color);
  }
};
