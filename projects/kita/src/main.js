import { assetsLoad } from "./assets.js";

import { Input } from "./input.js";
import { Bitmap } from "./gfx/bitmap.js";
import { Screen } from "./screen.js";

import { Game } from "./game/game.js";
import { GUI } from "./gui/gui.js";

import { SceneGame } from "./scene/sceneGame.js";
import { SceneMenu } from "./scene/sceneMenu.js";

import { HUD } from "./gfx/hud.js";
import { RendererGUI } from "./gfx/rendererGUI.js";
import { RendererGame } from "./gfx/rendererGame.js";

class App {
  constructor(assets)
  {
    this.screen = new Screen(document.getElementById("canvas"));
    this.bitmap = new Bitmap(256, 144);
    this.input = new Input();
    
    this.game = new Game();
    this.gui = new GUI(this.bitmap, assets.font);
    
    this.hud = new HUD(this.bitmap, assets.hud, assets.font);
    this.rendererGame = new RendererGame(this.bitmap, assets.entities);
    this.rendererGUI = new RendererGUI(this.bitmap);
    
    this.initScreen();
    this.initInput();
    this.initGame();
    
    this.sceneNow = null;
    this.sceneMap = {
      "sceneGame": new SceneGame(this),
      "sceneMenu": new SceneMenu(this)
    };
  }
  
  update(deltaTime)
  {
    this.sceneMap[this.sceneNow].update(deltaTime);
    
    this.rendererGame.render(this.game);
    this.hud.render(this.game);
    this.rendererGUI.render(this.gui);
    
    this.bitmap.swap();
    this.screen.swap(this.bitmap);
  }
  
  sceneLoad(sceneName)
  {
    if (this.sceneNow) {
      this.sceneMap[this.sceneNow].unload();
      this.gui.unload();
      this.input.unload();
      this.game.unload();
    }
    
    this.sceneNow = sceneName;
    this.sceneMap[this.sceneNow].load();
  }
  
  initGame()
  {
    this.game.addEventListener("mapLoad", (map) => {
      this.sceneMap[this.sceneNow].mapLoad(map);
      this.rendererGame.mapLoad(map);
    });
  }
  
  initScreen()
  {
    this.screen.addEventListener("keyEvent", (key, action) => {
      this.gui.keyEvent(key, action);
      this.input.keyEvent(key, action);
    });
  
    this.screen.addEventListener("mouseMove", (xMovement, yMovement) => {
      this.gui.mouseMove(xMovement, yMovement);
      this.input.mouseMove(xMovement, yMovement);
    });
    
    this.screen.addEventListener("mouseEvent", (button, action) => {
      this.gui.mouseEvent(button, action);
      this.input.mouseEvent(button, action);
    });
  }
  
  initInput()
  {
    this.input.bind("p", "pause_menu");
    
    this.input.bindAction("w", "forward");
    this.input.bindAction("a", "left");
    this.input.bindAction("s", "back");
    this.input.bindAction("d", "right");
    
    this.input.bindAction("mouse1", "attack1");
  }
};

function run(font)
{
  const app = new App(font);
  
  app.sceneLoad("sceneMenu");
  
  let prevTime = performance.now();

  function animate() {
    const nowTime = performance.now();
    const deltaTime = (nowTime - prevTime) * 0.001;
    prevTime = nowTime;
    
    app.update(deltaTime);
    
    window.requestAnimationFrame(animate);
  }
  
  window.requestAnimationFrame(animate);
};

assetsLoad(run);
