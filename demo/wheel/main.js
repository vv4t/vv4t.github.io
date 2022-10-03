"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";

const TIMESTEP = 0.015;

const canvas = document.getElementById("canvas");
const pen = new pen_t(canvas);
const input = new input_t(canvas);

const C_t = 10000;
const C_drag = 0.5;
const C_rr = C_drag * 30;

let x_g = 2.66;
const x_d = 9.42;
const n = 0.7;
const W_r = 0.34;
const W_m = 75;
const M = 1500;

const elem_throttle = document.getElementById("throttle");
const elem_torque = document.getElementById("torque");
const elem_velocity = document.getElementById("velocity");
const elem_rpm = document.getElementById("rpm");
const elem_slip_ratio = document.getElementById("slip_ratio");
const elem_gear_ratio = document.getElementById("gear_ratio");
const elem_time = document.getElementById("time");

const gear_table = [
  2.66,
  1.78,
  1.30,
  1.0,
  0.74,
  0.50
];

let start_time = new Date();
let start = false;

let wheel_ang_vel = 0;
let wheel_ang = 0;

let wheel_ang_vel_2 = 0;
let wheel_ang_2 = 0;

let car_vel = -0.5;
let car_pos = -1;

let prev_accel = 0;

function torque_rpm_curve(rpm)
{
  const x = rpm - 2000;
  
  return -0.000025 * x*x + 350;
}

function update()
{
  const end_pos = 1000 * 0.4;
  
  if (car_pos > 0 && car_pos < end_pos && !start) {
    start_time = new Date();
    start = true;
  }
  
  if (start && car_pos < end_pos) {
    elem_time.innerHTML = format_time(new Date() - start_time);
  }
  
  let throttle = 0;
  
  if (input.get_key(key.code("R"))) {
    start = false;
    car_vel = -0.1;
    car_pos = -1;
    wheel_ang = 0;
    wheel_ang_2 = 0;
    wheel_ang_vel = 0;
    wheel_ang_vel_2 = 0;
    elem_time.innerHTML = "00:00:00";
  }
  
  if (input.get_key(key.code("A")))
    throttle += 0.25;
  if (input.get_key(key.code("S")))
    throttle += 0.25;
  if (input.get_key(key.code("D")))
    throttle += 0.25;
  if (input.get_key(key.code("F")))
    throttle += 0.25;
  
  if (input.get_key(key.code("I")))
    x_g = gear_table[0];
  if (input.get_key(key.code("O")))
    x_g = gear_table[1];
  if (input.get_key(key.code("P")))
    x_g = gear_table[2];
  if (input.get_key(key.code("J")))
    x_g = gear_table[3];
  if (input.get_key(key.code("K")))
    x_g = gear_table[4];
  if (input.get_key(key.code("L")))
    x_g = gear_table[5];
  
  let T_brake = 0;
  if (input.get_key(key.code("X")))
    T_brake = -100;
  
  const rpm = Math.max(wheel_ang_vel * x_g * x_d * 60 / (2 * Math.PI), 1000);
  
  const T_max = torque_rpm_curve(rpm);
  const T_engine = throttle * T_max;
  
  const W_rear = 0.5 * 9.0 * M - M * prev_accel;
  const W_front = 0.5 * 9.0 * M + M * prev_accel;
  
  const mu = 1.0;
  const F_max = mu * W_rear;
  const F_max_2 = mu * W_front;
  
  const abs_car_vel = Math.abs(car_vel);
    
  const slip_ratio = (wheel_ang_vel * W_r - car_vel) / Math.max(abs_car_vel, 5);
  const slip_ratio_2 = (wheel_ang_vel_2 * W_r - car_vel) / Math.max(abs_car_vel, 5);
  
  const F_traction = clamp(C_t * slip_ratio, -F_max, F_max);
  const F_traction_2 = clamp(C_t * slip_ratio_2, -F_max_2, F_max_2);
  
  const T_drive = T_engine * x_g * x_d * n;
  let T_traction = F_traction * W_r;
  if (abs_car_vel < 10)
    T_traction = clamp(T_traction, -T_drive, T_drive);
  const T_total = T_drive - T_traction + T_brake;
  const I_wheel = W_m * W_r * W_r / 2;
  
  const T_traction_2 = F_traction_2 * W_r;
  const T_total_2 = -T_traction_2;
  
  const F_rr = -C_rr * Math.abs(car_vel);
  const F_drag = -C_drag * car_vel * car_vel;
  const F_total = F_traction + F_traction_2 + F_rr + F_drag;
  
  const ang_accel = T_total / I_wheel;
  wheel_ang_vel += ang_accel * TIMESTEP;
  wheel_ang += wheel_ang_vel * TIMESTEP;
  
  const ang_accel_2 = T_total_2 / I_wheel;
  wheel_ang_vel_2 += ang_accel_2 * TIMESTEP;
  wheel_ang_2 += wheel_ang_vel_2 * TIMESTEP;
  
  const accel = F_total / M;
  car_vel += accel * TIMESTEP;
  car_pos += car_vel * TIMESTEP;
  prev_accel = accel;
  
  const spokes = [
    new vec2_t(0, 1),
    new vec2_t(0, -1),
    new vec2_t(1, 0),
    new vec2_t(-1, 0)
  ];
  
  pen.clear();
  pen.begin();
  
  const w_rad = 0.05;
  const car_w = 0.4;
  const car_h = 0.2;
  
  const pos_wheel = new vec2_t(-0.25, -0.25);
  const pos_wheel_2 = new vec2_t(car_w, 0).add(pos_wheel);
  
  for (const spoke of spokes) {
    pen.line(pos_wheel, spoke.mulf(w_rad).rotate(-wheel_ang).add(pos_wheel));
    pen.line(pos_wheel_2, spoke.mulf(w_rad).rotate(-wheel_ang_2).add(pos_wheel_2));
  }
  
  pen.circle(pos_wheel, w_rad);
  pen.circle(pos_wheel_2, w_rad);
  
  pen.rect(pos_wheel.add(new vec2_t(0, car_h)), car_w, car_h);
  
  for (let i = 0; i < 1000; i++) {
    const road_pos = new vec2_t(i * car_w, -0.1 - 0.25).add(new vec2_t(-car_pos, 0));
    const road_pos_2 = road_pos.add(new vec2_t(0.05, -0.05));
    
    if (i % 10 == 0) {
      pen.circle(road_pos.add(new vec2_t(0, 0.3)), 0.3);
    }
    
    pen.line(road_pos, road_pos_2);
  }
  
  pen.stroke();
  
  elem_throttle.innerHTML = float_str(throttle);
  elem_velocity.innerHTML = float_str(car_vel * 3.6);
  elem_rpm.innerHTML = float_str(rpm);//float_str(wheel_ang_vel * 60 / (2 * Math.PI));
  elem_torque.innerHTML = float_str(T_engine);
  elem_slip_ratio.innerHTML = float_str(slip_ratio);
  elem_gear_ratio.innerHTML = float_str(x_g);
}

function float_str(f)
{
  return f.toFixed(2);
}

function format_time(elapsed_time)
{
  const minutes = Math.floor(elapsed_time / 60000) % 10;
  const seconds = Math.floor(elapsed_time / 1000) % 60;
  const miliseconds = Math.floor(elapsed_time / 10) % 100;
  
  return minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0") + ":" + miliseconds.toString().padStart(2, "0");
}
setInterval(function() {
  for (let i = 0; i < 1; i++)
  update();
}, TIMESTEP * 1000);
