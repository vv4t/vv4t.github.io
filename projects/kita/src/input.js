import { UserCommand } from "./game/game.js";

class Bind {
  constructor(name)
  {
    this.name = name;
    this.active = false;
  }
};

export class Input {
  constructor()
  {
    this.deltaMouseX = 0.0;
    
    this.actionActive = true;
    this.actionBinds = {};
    this.actionStates = {};
    
    this.bindKeys = {};
    this.bindFuncs = {};
  }
  
  startAction()
  {
    this.actionActive = true;
  }
  
  stopAction()
  {
    for (let [key, value] of Object.entries(this.actionStates))
      this.actionStates[key] = 0.0;
    
    this.actionActive = false;
  }
  
  bindAction(key, action)
  {
    this.actionBinds[key] = action;
    this.actionStates[action] = 0.0;
  }
  
  bind(key, name)
  {
    if (!this.bindKeys[key])
      this.bindKeys[key] = new Bind(name);
  }
  
  setBind(name, func)
  {
    this.bindFuncs[name] = func;
  }
  
  unload()
  {
    this.bindFuncs = {};
  }
  
  mouseMove(xMovement, yMovement)
  {
    if (this.actionActive)
      this.deltaMouseX += xMovement; 
  }
  
  mouseEvent(button, action)
  {
    const key = "mouse" + (button + 1).toString();
    this.keyEvent(key, action);
  }
  
  keyEvent(key, action)
  {
    if (this.bindKeys[key]) {
      if (action) {
        if (!this.bindKeys[key].active) {
          this.bindFuncs[this.bindKeys[key].name]();
          this.bindKeys[key].active = false;
        }
      } else {
        this.bindKeys[key].active = false;
      }
    }
    
    if (this.actionActive) {
      if (this.actionBinds[key] != undefined)
        this.actionStates[this.actionBinds[key]] = action;
    }
  }
  
  getUserCommand()
  {
    const userCommand = new UserCommand(
      this.actionStates["right"] - this.actionStates["left"],
      this.actionStates["forward"] - this.actionStates["back"],
      this.actionStates["attack1"],
      -this.deltaMouseX
    );
    
    this.deltaMouseX = 0.0;
    
    return userCommand;
  }
};
