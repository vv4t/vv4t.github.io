"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);
  
  input.set_mouse_lock(true);

  const shader = await scene.load_shader("shader.glsl", [ "sky" ]);
  
  const skybox = await scene.load_cubemap("../assets/sky", "jpg");
  const buffer = scene.add_buffer(800, 600);

  const mouse = new Float32Array(2);
  scene.add_data("ubo", [mouse]);

  scene.add_pass([skybox], shader, []);

  const update = () => {
    mouse[0] = input.get_mouse_x() / 600.0;
    mouse[1] = -input.get_mouse_y() / 600.0;
    
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

run();
