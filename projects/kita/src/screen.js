
export class Screen {
  constructor(canvas)
  {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.initInput();
    this.listeners = {};
    this.listeners["keyEvent"] = [];
    this.listeners["mouseMove"] = [];
    this.listeners["mouseEvent"] = [];
  }
  
  initInput()
  {
    const keyDown = (e) => {
      for (const action of this.listeners["keyEvent"])
        action(e.key, 1.0);
    };
    
    const keyUp = (e) => {
      for (const action of this.listeners["keyEvent"])
        action(e.key, 0.0);
    };
    
    const mouseMove = (e) => {
      for (const action of this.listeners["mouseMove"])
        action(e.movementX, e.movementY);
    };
    
    const mouseDown = (e) => {
      for (const action of this.listeners["mouseEvent"])
        action(e.button, 1.0);
    };
    
    const mouseUp = (e) => {
      for (const action of this.listeners["mouseEvent"])
        action(e.button, 0.0);
    };
    
    document.addEventListener("pointerlockchange", (e) => {
      if (document.pointerLockElement == canvas
      || document.mozPointerLockElement == canvas) {
        document.addEventListener("mousemove", mouseMove);
        document.addEventListener("mousedown", mouseDown);
        document.addEventListener("mouseup", mouseUp);
        document.addEventListener("keydown", keyDown);
        document.addEventListener("keyup", keyUp);
      } else {
        document.removeEventListener("mousemove", mouseMove);
        document.removeEventListener("mousedown", mouseDown);
        document.removeEventListener("mouseup", mouseUp);
        document.removeEventListener("keydown", keyDown);
        document.removeEventListener("keyup", keyUp);
      }
    });
    
    canvas.addEventListener("click", function() {
      canvas.requestPointerLock();
    });
  }
  
  addEventListener(name, action)
  {
    this.listeners[name].push(action);
  }
  
  swap(bitmap)
  {
    this.ctx.drawImage(bitmap.canvas, 0, 0, this.canvas.width, this.canvas.height);
  }
}
