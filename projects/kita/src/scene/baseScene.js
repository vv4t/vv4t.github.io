export class BaseScene {
  constructor(app)
  {
    if (this.constructor == BaseScene) 
      throw new Error("Abstract base class BaseScene can not be instantiated.");
    
    this.app = app;
  }
  
  mapLoad()
  {
    throw new Error("No mapLoad method implemented.")
  }
  
  load()
  {
    throw new Error("No load method implemented.")
  }
  
  unload()
  {
    throw new Error("No unload method implemented.")
  }
  
  update()
  {
    throw new Error("No update method implemented.")
  }
};
