"use strict";

import { scene_t } from "../core/scene.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);

  const shader = await scene.load_shader("shader.glsl", []);
  scene.add_pass([], shader, []);

  const update = () => {
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

run();
