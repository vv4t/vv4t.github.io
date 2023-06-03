export class input_t
{
  constructor()
  {
    this.action = {
      "forward": false,
      "back": false,
      "left": false,
      "right": false,
      "place": false
    };
    
    this.key_binds = {
      "w": "forward",
      "a": "left",
      "s": "back",
      "d": "right",
      " ": "place",
      "c": "remove"
    };
    
    this.mouse_binds = {
      0: "look"
    };
    
    this.mouse_x = 0.0;
    this.mouse_y = 0.0;
    
    this.init_key();
    this.init_mouse();
  }
  
  init_mouse()
  {
    const canvas = document.getElementById("display");
    
    canvas.addEventListener("mousedown", (e) => {
      if (this.mouse_binds[e.button])
        this.action[this.mouse_binds[e.button]] = true;
    });
    
    canvas.addEventListener("mouseup", (e) => {
      if (this.mouse_binds[e.button])
        this.action[this.mouse_binds[e.button]] = false;
    });
    
    canvas.addEventListener("mousemove", (e) => {
      this.mouse_x = e.offsetX;
      this.mouse_y = e.offsetY;
    });
  }
  
  init_key()
  {
    document.addEventListener("keydown", (e) => {
      if (this.key_binds[e.key])
        this.action[this.key_binds[e.key]] = true;
    });
    
    document.addEventListener("keyup", (e) => {
      if (this.key_binds[e.key])
        this.action[this.key_binds[e.key]] = false;
    });
  }
}
