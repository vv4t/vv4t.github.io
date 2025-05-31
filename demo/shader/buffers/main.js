"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);

  const shader = await scene.load_shader("shader.glsl", [ "image" ]);
  
  const image = await scene.load_image("../assets/image.jpg");
  const buffer = scene.add_buffer(800, 600);

  const time = new Float32Array(1);
  scene.add_data("ubo", [time]);

  scene.add_pass([image], shader, [buffer]);
  scene.add_pass([buffer], shader, []);

  const update = () => {
    time[0] += 0.01;
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

run();
