"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";
import { vec3_t } from "../core/math.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);
  
  input.set_mouse_lock(true);

  const shader = await scene.load_shader("shader.glsl", []);
  const dither = await scene.load_shader("../util/dither.glsl", [ "image" ]);
  
  const buffer = scene.add_buffer(200, 150);

  const view_pos = new Float32Array(3);
  const view_yaw = new Float32Array(1);
  const view_pitch = new Float32Array(1);
  scene.add_data("ubo", [view_pos, view_yaw, view_pitch]);
  
  view_pos[0] = 0.5;
  view_pos[1] = f(view_pos[0], view_pos[2]) + 1.0;

  scene.add_pass([], shader, [buffer]);
  scene.add_pass([buffer], dither, []);
  
  const step_count = document.getElementById("step");

  const update = () => {
    step.innerText = "STEP: " + Math.floor(view_pos[1] * Math.PI);
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
  
  const new_x = view_pos[0] + move.x;
  const new_z = view_pos[2] + move.z;
  
  const a = f(view_pos[0], view_pos[2]);
  const b = f(new_x, new_z);
  
  if (Math.abs(a - b) < 0.5) {
    view_pos[0] = new_x;
    view_pos[2] = new_z;
    view_pos[1] = b + 1.0;
  }
  
  view_yaw[0] = input.get_mouse_x() / 600.0;
  view_pitch[0] = -input.get_mouse_y() / 600.0;
}

function f(x, y) {
  x *= 0.3;
  y *= 0.3;
  const t = (Math.atan2(y, x) + Math.PI) / (2.0 * Math.PI);
  const r = Math.sqrt(x*x + y*y);
  const z = Math.floor(r + t) - t;
  const s = Math.PI * 4.0;
  return Math.floor(z * s) / s * 4.0;
}

run();
