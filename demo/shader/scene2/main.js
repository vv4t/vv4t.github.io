"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";
import { vec3_t } from "../core/math.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);
  
  input.set_mouse_lock(true);

  const shader = await scene.load_shader("shader.glsl", [ "tile_albedo", "tile_normal", "tile_roughness" ]);
  const tonemap = await scene.load_shader("../util/tonemap.glsl", [ "image" ]);
  const dither = await scene.load_shader("../util/dither.glsl", [ "image" ]);
  
  const albedo = await scene.load_image("../assets/checker/albedo.jpg");
  const normal = await scene.load_image("../assets/checker/normal.jpg");
  const roughness = await scene.load_image("../assets/checker/roughness.jpg");
  
  const buffer1 = scene.add_buffer(400, 300);
  const buffer2 = scene.add_buffer(400, 300);

  const view_pos = new Float32Array(3);
  const view_yaw = new Float32Array(1);
  const view_pitch = new Float32Array(1);
  scene.add_data("ubo", [view_pos, view_yaw, view_pitch]);

  scene.add_pass([albedo, normal, roughness], shader, [buffer1]);
  scene.add_pass([buffer1], tonemap, [buffer2]);
  scene.add_pass([buffer2], dither, []);
  
  view_pos[1] = 3;

  const update = () => {
    free_move(input, view_pos, view_yaw, view_pitch);
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

function free_move(input, view_pos, view_yaw, view_pitch) {
  const forward = new vec3_t(0.0, 0.0, 0.05).rotate_y(-view_yaw[0]);
  const side = new vec3_t(0.05, 0.0, 0.0).rotate_y(-view_yaw[0]);
  let move = new vec3_t();
  
  if (input.get_key('W')) move = move.add(forward);
  if (input.get_key('A')) move = move.add(side.mulf(-1));
  if (input.get_key('S')) move = move.add(forward.mulf(-1));
  if (input.get_key('D')) move = move.add(side);
  
  view_pos[0] += move.x;
  view_pos[1] += move.y;
  view_pos[2] += move.z;
  
  view_yaw[0] = input.get_mouse_x() / 600.0;
  view_pitch[0] = -input.get_mouse_y() / 600.0;
}

run();
