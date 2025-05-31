"use strict";

import { scene_t } from "../core/scene.js";
import { input_t } from "../core/input.js";
import { vec3_t } from "../core/math.js";

async function run() {
  const canvas = document.getElementById("display");
  const scene = new scene_t(canvas);
  const input = new input_t(canvas);
  
  input.set_mouse_lock(true);

  const shader = await scene.load_shader("shader.glsl", [ "sky" ]);
  
  const skybox = await scene.load_cubemap("../assets/sky", "jpg");
  const buffer = scene.add_buffer(800, 600);

  const view_pos = new Float32Array(3);
  const yaw = new Float32Array(1);
  const pitch = new Float32Array(1);
  scene.add_data("ubo", [view_pos, yaw, pitch]);

  scene.add_pass([skybox], shader, []);

  const update = () => {
    const forward = new vec3_t(0.0, 0.0, 0.1).rotate_zxy(new vec3_t(-pitch[0], -yaw[0], 0.0));
    const side = new vec3_t(0.1, 0.0, 0.0).rotate_zxy(new vec3_t(-pitch[0], -yaw[0], 0.0));
    let move = new vec3_t();
    
    if (input.get_key('W')) move = move.add(forward);
    if (input.get_key('A')) move = move.add(side.mulf(-1));
    if (input.get_key('S')) move = move.add(forward.mulf(-1));
    if (input.get_key('D')) move = move.add(side);
    
    view_pos[0] += move.x;
    view_pos[1] += move.y;
    view_pos[2] += move.z;
    
    
    yaw[0] = input.get_mouse_x() / 600.0;
    pitch[0] = -input.get_mouse_y() / 600.0;
    
    scene.render();
    requestAnimationFrame(update);
  };

  requestAnimationFrame(update);
}

run();
