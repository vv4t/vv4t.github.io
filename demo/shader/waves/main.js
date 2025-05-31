"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);

  const shader = await scene.load_shader("shader.glsl", [ "image" ]);
  const wave = await scene.load_shader("wave.glsl", [ "displace", "state" ]);
  const displace = await scene.load_shader("displace.glsl", [ "state" ]);
  
  const buffer1 = scene.add_buffer(800, 600);
  const buffer2 = scene.add_buffer(800, 600);
  const buffer3 = scene.add_buffer(800, 600);

  const mouse = new Float32Array(2);
  const add = new Float32Array(1);
  scene.add_data("ubo", [mouse, add]);

  scene.add_pass([], displace, [buffer3]);
  scene.add_pass([buffer3, buffer1], wave, [buffer2]);
  scene.add_pass([buffer3, buffer2], wave, [buffer1]);
  scene.add_pass([buffer1], shader, []);

  const update = () => {
    mouse[0] = input.get_mouse_x();
    mouse[1] = 600 - input.get_mouse_y();
    add[0] = input.get_key('W') ? Math.random() * 0.04 : 0;
    
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

run();
