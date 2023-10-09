"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera, 1.3 * canvas.height / canvas.width);
const input = new input_t(canvas);

const TIMESTEP = 0.015;

let T = new vec2_t(0.1, 0.1);

const O = [ 0, 0 ];
const dO = [ 0, 0.1 ];

function update()
{
  T = input.get_mouse_pos();
  
  const C = C_1;
  
  const [J_x, J_y] = J(C, O);
  const J_v = J_x * dO[0] + J_y * dO[1];
  
  const bias = 13 * C(O);
  const lambda = -(J_v + bias);
  
  dO[0] += J_x * lambda;
  dO[1] += J_y * lambda;
  
  O[0] += dO[0] * 0.015;
  O[1] += dO[1] * 0.015;
  
  pen.clear();
  
  pen.begin();
  pen.circle(T, 0.02);
  pen.circle(T, 0.01);
  
  const t0 = new vec2_t();
  const t1 = new vec2_t(0.3).rotate(O[0]).add(t0);
  const t2 = new vec2_t(0.3).rotate(O[1]).add(t1);
  
  pen.circle(t0, 0.01);
  pen.circle(t1, 0.01);
  pen.circle(t2, 0.01);
  
  pen.line(t0, t1);
  pen.line(t1, t2);
  
  pen.stroke();
}

function C_1(O)
{
  const t0 = new vec2_t();
  const t1 = new vec2_t(0.3).rotate(O[0]);
  const t2 = new vec2_t(0.3).rotate(O[1]);
  
  const P = t0.add(t1).add(t2);
  
  const V = T.sub(P);
  
  return V.length();
}

function J(C, p)
{
  const h = 0.01;
  
  const dC_dx = (C([ O[0]+h, O[1] ]) - C([ O[0], O[1] ])) * (1/h);
  const dC_dy = (C([ O[0], O[1]+h ]) - C([ O[0], O[1] ])) * (1/h);
  
  return [ dC_dx, dC_dy ];
}

setInterval(function() {
  update();
}, 16);
