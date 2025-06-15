"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";
import { vec3_t } from "../core/math.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);
  
  input.set_mouse_lock(true);

  const shader = await scene.load_shader("shader.glsl", [ "water", "tile_albedo", "tile_normal", "tile_roughness" ]);
  const wave = await scene.load_shader("../waves/wave.glsl", [ "displace", "state" ]);
  const displace = await scene.load_shader("displace.glsl", [ "state" ]);
  const tonemap = await scene.load_shader("../util/tonemap.glsl", [ "image" ]);
  const dither = await scene.load_shader("../util/dither.glsl", [ "image" ]);
  
  const albedo = await scene.load_image("../assets/tile/albedo.jpg");
  const normal = await scene.load_image("../assets/tile/normal.jpg");
  const roughness = await scene.load_image("../assets/tile/roughness.jpg");
  
  const buffer1 = scene.add_buffer(400, 300);
  const buffer2 = scene.add_buffer(400, 300);
  
  const buffer3 = scene.add_buffer(256, 256);
  const buffer4 = scene.add_buffer(256, 256);
  const buffer5 = scene.add_buffer(256, 256);

  const view_pos = new Float32Array(3);
  const view_yaw = new Float32Array(1);
  const view_pitch = new Float32Array(1);
  scene.add_data("ubo", [view_pos, view_yaw, view_pitch]);
  
  view_pos[0] = -8;
  view_pos[1] = 2;
  view_pos[1] = -1;

  scene.add_pass([], displace, [buffer3]);
  scene.add_pass([buffer3, buffer4], wave, [buffer5]);
  scene.add_pass([buffer3, buffer5], wave, [buffer4]);
  scene.add_pass([buffer4, albedo, normal, roughness], shader, [buffer1]);
  scene.add_pass([buffer1], tonemap, [buffer2]);
  scene.add_pass([buffer2], dither, []);

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
  
  const d = 0.3;
  let new_x = view_pos[0] + move.x;
  let new_z = view_pos[2] + move.z;
  
  if (new_x < -10.0 + d || new_x > 5.0 - d) new_x = view_pos[0];
  if (new_z < -5.0 + d || new_z > 5.0 - d) new_z = view_pos[2];
  if (new_z > 2.0 && new_x < -5.0 + d) new_x = -5.0 + d;
  if (new_x < -5.0 && new_z > 2.0 - d) new_z = 2.0 - d;
  
  view_pos[0] = new_x;
  view_pos[2] = new_z;
  view_pos[1] = new_x > -5.0 && new_x < 5.0 && new_z > -5.0 && new_z < 5.0 ? 1.0 : 2.0;
  
  view_yaw[0] = input.get_mouse_x() / 600.0 + Math.PI / 2.0;
  view_pitch[0] = -input.get_mouse_y() / 600.0;
}

run();
