import { BaseScene } from "./baseScene.js";
import { Vector2, Vector3 } from "../util/math.js";
import { Zombie } from "../game/entities/zombie.js";

export class SceneGame extends BaseScene {
  constructor(app)
  {
    super(app);
  }
  
  load()
  {
    this.app.hud.isVisible = true;
    this.app.gui.isActive = false;
    this.app.input.startAction();
    
    this.app.input.setBind("pause_menu", () => {
      this.app.hud.isVisible = false;
      this.app.gui.isActive = true;
      this.app.input.stopAction();
    });
    
    this.initGUI();
    
    this.app.game.mapLoad("hospital");
  }
  
  mapLoad()
  {
    this.app.game.player.pos = new Vector3(3.0, 3.0, 0.0);
    this.app.game.entities.push(new Zombie(new Vector3(20, 20, 0.0)));
  }
  
  initGUI()
  {
    const labelKita = this.app.gui.addLabel("kita", new Vector2(10, 10));
    
    const buttonQuit = this.app.gui.addButton(
      "quit",
      () => {
        this.app.sceneLoad("sceneMenu");
      },
      new Vector2(10, labelKita.offset.y + labelKita.size.y + 1),
      new Vector2(64, 9),
    );
  }
  
  unload()
  {
    
  }
  
  update(deltaTime)
  {
    this.app.game.update(deltaTime, this.app.input.getUserCommand());
  }
};
