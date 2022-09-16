"use strict";

import { pen_t } from "./pen.js";
import { pen3d_t } from "./pen3d.js";
import { input_t, key } from "./input.js";
import { clamp, vec2_t, vec3_t } from "./math.js";
import { camera_t } from "./camera.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera);
const input = new input_t(canvas);

let time = 0;

let prev_my = 0;

function load_file(path, on_load)
{
  const xhttp = new XMLHttpRequest();
  xhttp.onload = function(e) {
    on_load(xhttp.responseText);
  };
  xhttp.open("GET", path);
  xhttp.send();
}

let faces = [];

function scene_load_obj()
{
  load_file("monkey.obj", function(obj_file) {
    const obj_cmds = obj_file.split("\n");
    
    const v_list = [];
    const f_list = [];
    
    for (const line of obj_cmds) {
      const args = line.split(" ");
      if (args[0] == "v") {
        v_list.push(
          new vec3_t(
            parseFloat(args[1]),
            parseFloat(args[2]),
            parseFloat(args[3])));
      } else if (args[0] == "f") {
        f_list.push([
          v_list[parseInt(args[1]) - 1],
          v_list[parseInt(args[2]) - 1],
          v_list[parseInt(args[3]) - 1]]);
      }
    }
    
    faces = f_list;
  });
}

function y_height(x, z, t)
{
  const wave = (Math.sin(0.5 * x - t * 2.0) - Math.cos(0.4 * z - t * 0.5)) - 1;
  
  return wave;
}

function update()
{
  pen.clear();
  pen.begin();
  
  if (input.lock_status()) {
    const SPD = 3 * 0.015;
    if (input.get_key(key.code("W")))
      camera.pos = camera.pos.add(new vec3_t(0, 0, SPD).rotate_zxy(camera.rot));
    if (input.get_key(key.code("A")))
      camera.pos = camera.pos.add(new vec3_t(-SPD, 0, 0).rotate_zxy(camera.rot));
    if (input.get_key(key.code("S")))
      camera.pos = camera.pos.add(new vec3_t(0, 0, -SPD).rotate_zxy(camera.rot));
    if (input.get_key(key.code("D")))
      camera.pos = camera.pos.add(new vec3_t(SPD, 0, 0).rotate_zxy(camera.rot));
    
    const now_my = -input.get_mouse_pos().y * 2 * Math.PI;
    const d_my = now_my - prev_my;
    prev_my = now_my;
    
    camera.rot.x = clamp(camera.rot.x + d_my, -Math.PI / 2.0, Math.PI / 2.0);
    camera.rot.y = -input.get_mouse_pos().x * 2 * Math.PI;
  } else if (input.get_mouse_down()) {
    input.lock();
  }
  
  for (let x = -10; x <= 10; x++) {
    for (let z = -10; z <= 10; z++) {
      const y_0 = y_height(x, z, time);
      const y_1 = y_height(x + 1, z, time);
      const y_2 = y_height(x, z + 1, time);
      
      pen3d.circle(new vec3_t(x, y_0, z), 0.05);
      if (x < 10)
        pen3d.line(new vec3_t(x, y_0, z), new vec3_t(x + 1, y_1, z));
      if (z < 10)
        pen3d.line(new vec3_t(x, y_0, z), new vec3_t(x, y_2, z + 1));
    }
  }
  
  const monkey_x = 0;
  const monkey_z = 0;
  const monkey_y = y_height(monkey_x, monkey_z, time);
  const monkey_origin = new vec3_t(monkey_x, monkey_y, monkey_z);
  
  const monkey_bitangent = new vec3_t(monkey_x + 1, y_height(monkey_x + 1, monkey_z, time), monkey_z).sub(monkey_origin);
  const monkey_tangent = new vec3_t(monkey_x, y_height(monkey_x, monkey_z + 1, time), monkey_z + 1).sub(monkey_origin);
  const monkey_normal = monkey_tangent.cross(monkey_bitangent);
  
  const rot_z = Math.atan2(monkey_normal.x, monkey_normal.y);
  const rot_x = Math.atan2(monkey_normal.z, monkey_normal.y);
  
  for (const face of faces) {
    const f_0 = face[0].rotate_zyx(new vec3_t(rot_x, 0, -rot_z)).add(monkey_origin).add(monkey_normal.mulf(0.5));
    const f_1 = face[1].rotate_zyx(new vec3_t(rot_x, 0, -rot_z)).add(monkey_origin).add(monkey_normal.mulf(0.5));
    const f_2 = face[2].rotate_zyx(new vec3_t(rot_x, 0, -rot_z)).add(monkey_origin).add(monkey_normal.mulf(0.5));
    
    pen3d.line(f_0, f_1);
    pen3d.line(f_1, f_2);
    pen3d.line(f_2, f_0);
  }

  pen.stroke();
}

scene_load_obj();

setInterval(function () {
  update();
  time += 0.015;
}, 15);
