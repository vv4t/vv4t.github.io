"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { matrix_t, matrix_from } from "./matrix.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera, 1.3 * canvas.height / canvas.width);
const input = new input_t(canvas);

const TIMESTEP = 0.015;

let T = new vec2_t(0.1, 0.1);

const B_n = 8;
const B = Array.from({length: B_n}, () => Math.random());
const dB = Array.from({length: B_n}, () => Math.random());

const R = 0.1;

function update()
{
  T = input.get_mouse_pos();
  
  const C = [ C_4, C_5 ];
  const O = matrix_from([B]).transpose();
  const dO = matrix_from([dB]).transpose();
  
  const F = solve(C, O, dO, 1);
  
  for (let i = 0; i < B.length; i++) {
    dB[i] += F.get(i,0);
    dB[i] *= 0.9;
    B[i] += dB[i] * TIMESTEP;
  }
  
  pen.clear();
  pen.begin();
  
  let p = new vec2_t();
  for (let i = 0; i < B.length; i++) {
    const t_n = new vec2_t(0, R).rotate(B[i]);
    pen.circle(p, 0.01);
    pen.line(p, p.add(t_n));
    p = p.add(t_n);
  }
  
  pen.stroke();
}

function solve(C, T, dT, beta)
{
  const J = J_calc(C, T);
  const Jt = J.transpose();
  const Jv = J.mul(dT);
  const J_Jt = J.mul(Jt);
  
  const bias = matrix_from(C.map((C_i) => [beta / TIMESTEP * C_i(T)]));
  const lambda = J_Jt.inverse().mul(Jv.add(bias).mulf(-1));
  
  const F = Jt.mul(lambda);
  
  return F;
}

function C_4(O)
{
  let p = new vec2_t();
  
  for (let i = 0; i < O.row; i++) {
    const t_n = new vec2_t(0, R).rotate(O.get(i,0));
    p = p.add(t_n);
  }
  
  const d = p.sub(T);
  
  return d.x;
}

function C_5(O)
{
  let p = new vec2_t();
  for (let i = 0; i < O.row; i++) {
    const t_n = new vec2_t(0, R).rotate(O.get(i,0));
    p = p.add(t_n);
  }
  
  const d = p.sub(T);
  
  return d.y;
}

function J_calc(C, p)
{
  const h = 0.001;
  
  const J = new matrix_t(C.length, p.row);
  
  for (let i = 0; i < C.length; i++) {
    const C_p = C[i](p);
    
    for (let j = 0; j < p.row; j++) {
      const p_j = p.get(j, 0);
      
      p.set(j, 0, p_j + h);
      const dC_dp_j = (C[i](p) - C_p) / h;
      p.set(j, 0, p_j);
      
      J.set(i, j, dC_dp_j);
    }
  }
  
  return J;
}
update();

setInterval(function() {
  update();
}, 16);
