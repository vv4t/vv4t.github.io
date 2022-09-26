"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";

const TIMESTEP = 0.015;

const canvas = document.getElementById("canvas");
const pen = new pen_t(canvas);
const input = new input_t(canvas);

const C_t = 100;
const C_drag = 0.1;
const C_rr = C_drag * 30;

const x_g = 2.66;
const x_d = 3.42;
const n = 0.7;
const W_r = 0.34;
const M = 1500;

let wheel_ang_vel = 0;
let wheel_ang = 0;
let car_vel = 0.5;

function update()
{
  let throttle = 0;
  
  if (input.get_key(key.code("A")))
    throttle = 0.5;
  
  const T_max = 448;
  const T_engine = throttle * T_max;
  
  const T_drive = T_engine * x_g * x_d * n;
  
  const slip_ratio = (wheel_ang_vel * W_r - car_vel) / Math.abs(car_vel);
  const F_traction = C_t * slip_ratio;
  const T_traction = F_traction * W_r;
  const T_total = T_drive + T_traction;
  
  const I_wheel = M * W_r * W_r / 2;
  const ang_accel = T_total / I_wheel;
  
  wheel_ang_vel += ang_accel * TIMESTEP;
  wheel_ang += wheel_ang_vel * TIMESTEP;
  
  const F_drag = -C_drag * car_vel * Math.abs(car_vel);
  const F_rr = -C_rr * car_vel;
  const F_net = F_traction + F_drag + F_rr;
  
  const car_accel = F_net / M;
  
  car_vel += car_accel;
  
  console.log(car_vel);
  
  pen.clear();
  pen.begin();
  pen.line(new vec2_t(0, 0), new vec2_t(0, 0.1).rotate(wheel_ang));
  pen.circle(new vec2_t(0, 0), 0.1);
  pen.stroke();
}

setInterval(function() {
  update();
}, TIMESTEP * 1000);
