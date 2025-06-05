"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";
import { vec3_t } from "../core/math.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);
  
  input.set_mouse_lock(true);

  const shader = await scene.load_shader("shader.glsl", [ "sky", "water" ]);
  const wave = await scene.load_shader("../waves/wave.glsl", [ "displace", "state" ]);
  const displace = await scene.load_shader("displace.glsl", [ "state" ]);
  
  const skybox = await scene.load_cubemap("../assets/sky", "jpg");
  const buffer1 = scene.add_buffer(256, 256);
  const buffer2 = scene.add_buffer(256, 256);
  const buffer3 = scene.add_buffer(256, 256);

  const view_pos = new Float32Array(3);
  const view_yaw = new Float32Array(1);
  const cube_pos = new Float32Array(3);
  const view_pitch = new Float32Array(1);
  const cube_vel = new Float32Array(1);
  scene.add_data("ubo", [view_pos, view_yaw, cube_pos, view_pitch, cube_vel]);
  
  view_pos[0] = 4;
  view_pos[2] = 4;
  
  cube_pos[0] = 1;
  cube_pos[1] = 1;
  cube_pos[2] = 1;

  scene.add_pass([], displace, [buffer3]);
  scene.add_pass([buffer3, buffer1], wave, [buffer2]);
  scene.add_pass([buffer3, buffer2], wave, [buffer1]);
  scene.add_pass([skybox, buffer1], shader, []);

  const update = () => {
    free_move(input, view_pos, view_yaw, view_pitch);
    sink_at_pool(view_pos);
    move_cube(input, view_pos, view_yaw, view_pitch, cube_pos, cube_vel);
    cube_fall(cube_pos, cube_vel);
    
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

function move_cube(input, view_pos, view_yaw, view_pitch, cube_pos, cube_vel) {
  if (!input.get_key(" ")) return;
  
  const forward = new vec3_t(0.0, 0.0, 2.0).rotate_x(-view_pitch[0]).rotate_y(-view_yaw[0]);
  
  cube_pos[0] = view_pos[0] + forward.x;
  cube_pos[1] = view_pos[1] + forward.y;
  cube_pos[2] = view_pos[2] + forward.z;
  
  cube_vel[0] = 0.0;
}

function cube_fall(cube_pos, cube_vel) {
  let floor = -1.0;
  
  if (
    cube_pos[0] > 5.0 && cube_pos[0] + 0.5 < 10.0 &&
    cube_pos[2] > 5.0 && cube_pos[2] + 0.5 < 10.0
  ) {
    floor = -1.5;
  }
  
  if (cube_pos[1] + cube_vel[0] > floor) {
    cube_pos[1] += cube_vel[0];
    cube_vel[0] -= 0.01;
  } else {
    cube_pos[1] = floor;
    cube_vel[0] = 0.0;
  }
}

function sink_at_pool(view_pos) {
  const x = view_pos[0];
  const z = view_pos[2];
  
  if (x > 5 && z > 5 && x < 10 && z < 10) {
    view_pos[1] = -0.4;
  } else {
    view_pos[1] = 0.0;
  }
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
