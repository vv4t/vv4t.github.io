import { Vector2 } from "../util/math.js";
import { UserCommand } from "../game/game.js";

export class SceneMenu {
  constructor(app)
  {
    this.app = app;
    this.time = 0.0;
  }
  
  load()
  {
    this.app.input.stopAction();
    this.app.gui.isActive = true;
    this.app.hud.isVisible = false;
    
    this.initGUI();
    
    this.app.game.mapLoad("nexus");
  }
  
  mapLoad()
  {
    this.app.game.player.pos = new Vector2(3.0, 3.0);
  }
  
  initGUI()
  {
    const labelKita = this.app.gui.addLabel("kita", new Vector2(10, 10));
    
    const buttonPlay = this.app.gui.addButton(
      "play",
      () => {
        this.app.sceneLoad("sceneGame");
      },
      new Vector2(10, labelKita.offset.y + labelKita.size.y + 1),
      new Vector2(64, 9),
    );
    
    const buttonCredits = this.app.gui.addButton(
      "credits",
      () => {
        this.app.sceneLoad("sceneGame");
      },
      new Vector2(10, buttonPlay.offset.y + buttonPlay.size.y + 1),
      new Vector2(64, 9),
    );
  }
  
  unload()
  {
    
  }
  
  update(deltaTime)
  {
    this.time += deltaTime;
    this.app.game.player.rot = Math.cos(this.time);
    this.app.game.update(deltaTime, new UserCommand(0.0, 0.0, 0.0, 0.0));
  }
};
