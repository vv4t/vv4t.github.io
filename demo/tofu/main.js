"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { rand, clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";
import { obj_load } from "../misuzu/obj.js";

const canvas = document.getElementById("canvas");
const pen = new pen_t(canvas);
const input = new input_t(canvas);
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen3d = new pen3d_t(pen, camera, 1.3 * canvas.height / canvas.width);

pen.color("white");

const debug = document.getElementById("debug");

const TIMESTEP = 0.015;

const CAR_MASS = 1500;
const WHEEL_MASS = 75;
const WHEEL_RADIUS = 0.34;

const elem_torque = document.getElementById("torque");
const elem_velocity = document.getElementById("velocity");
const elem_rpm = document.getElementById("rpm");
const elem_slip_ratio = document.getElementById("slip_ratio");
const elem_slip_angle = document.getElementById("slip_angle");
const elem_gear = document.getElementById("gear");
const elem_time = document.getElementById("time");
const elem_auto_gear = document.getElementById("auto_gear");
const elem_volume = document.getElementById("volume");

const pen_torque = new pen_t(document.getElementById("graph_torque"));
pen_torque.color("white");

let oscillator;
let gain_node;

let slip_oscillator;
let slip_gain_node;

document.addEventListener("keydown", function() {
  if (!oscillator) {
    const context = new AudioContext();
    gain_node = context.createGain();

    gain_node.connect(context.destination);
    gain_node.gain.value = 0.05;

    oscillator = context.createOscillator();
    oscillator.connect(gain_node);
    oscillator.frequency.value = 100;
    oscillator.type = "sawtooth";
    oscillator.start();
    
    slip_gain_node = context.createGain();

    slip_gain_node.connect(context.destination);
    slip_gain_node.gain.value = 0.05;

    slip_oscillator = context.createOscillator();
    slip_oscillator.connect(slip_gain_node);
    slip_oscillator.frequency.value = 100;
    slip_oscillator.type = "sawtooth";
    slip_oscillator.detune.value = 1200;
    slip_oscillator.start();
  }
});

const gear_table = [
  2.66,
  1.78,
  1.30,
  1.0,
  0.74,
  0.50
];

let prev_rpm = 0;

function graph_torque(rpm, x_g, x_d)
{
  pen_torque.clear();
  pen_torque.begin();
  
  const h = 60;
  const scale_y = 6000;
  const scale_x = 4000;
  
  for (const gear of gear_table) {
    for (let x = 0; x < h - 1; x++) {
      const x_a = x / h;
      const x_b = (x + 1) / h;
      
      const x_h_a = x_a * 1.8 - 0.9;
      const x_h_b = x_b * 1.8 - 0.9;
      
      const rpm_a = x_a * scale_x * gear * x_d;
      const rpm_b = x_b * scale_x * gear * x_d;
      
      if (rpm_a < 1000 || rpm_b > 5500)
        continue;
      
      const torque_a = torque_rpm_curve(rpm_a) * gear * x_d;
      const torque_b = torque_rpm_curve(rpm_b) * gear * x_d;
      
      const y_a = torque_a / scale_y - 0.5;
      const y_b = torque_b / scale_y - 0.5;
      
      pen_torque.line(new vec2_t(x_h_a, y_a), new vec2_t(x_h_b, y_b));
    }
  }
  
  const c_torque = torque_rpm_curve(rpm) * x_g * x_d;
  const c_x = rpm / x_g / x_d / scale_x * 1.8 - 0.9;
  const c_y = c_torque / scale_y - 0.5;
  
  const d_rpm = rpm - prev_rpm;
  const d_torque_rpm = (torque_rpm_curve(rpm) * x_g * x_d - torque_rpm_curve(prev_rpm) * x_g * x_d) / Math.abs(d_rpm);
  
  pen_torque.line(new vec2_t(c_x, c_y), new vec2_t(c_x, c_y).add(new vec2_t(0.1 * d_rpm / Math.abs(d_rpm), 0.1 * d_torque_rpm)));
  pen_torque.circle(new vec2_t(c_x, c_y), 0.02);
  
  prev_rpm = rpm;
  
  pen_torque.stroke();
}

function _torque_rpm_curve(rpm)
{
  const x = rpm - 3000;
  return 2*(-0.000025 * x*x + 300);
}

function torque_rpm_curve(rpm)
{
  const max_rpm = 5500;
  if (rpm > max_rpm) {
    const max_rpm_torque = _torque_rpm_curve(max_rpm);
    return -500;//Math.max(-4 * (rpm - max_rpm) + max_rpm_torque, -2000);
  }
  
  return _torque_rpm_curve(rpm);
}

function rot_vel_rpm(rot_vel, x_g, x_d)
{
  return clamp(Math.abs(rot_vel * x_g * x_d * 60 / (2 * Math.PI)), 1000, 6000);
}

class skid_t {
  constructor()
  {
    this.pos = new vec3_t();
    this.dir = new vec3_t();
  }
  
  skid(pos, dir)
  {
    this.pos = pos;
    this.dir = dir;
  }
  
  draw()
  {
    pen3d.line(this.pos, this.pos.add(this.dir));
  }
};

class wheel_t {
  constructor(dir)
  {
    this.dir = dir;
    this.rot = 0;
    this.rot_vel = 0;
    this.slip_angle = 0;
    this.slip_ratio = 0;
    
    this.C_t = 120000;
    this.C_a = 100000;
  }
  
  apply_traction(car_vel, car_rot, weight, T_drive, T_brake, handbrake)
  {
    this.dir = clamp(this.dir, -Math.PI / 2, +Math.PI / 2);
    
    const mu = 1.0;
    const F_max = mu * weight;
    
    const wheel_dir = new vec3_t(0, 0, 1).rotate_y(this.dir + car_rot);
    const perp_wheel_dir = new vec3_t(1, 0, 0).rotate_y(this.dir + car_rot);
    
    const move_vel = wheel_dir.dot(car_vel);
    const abs_move_vel = Math.abs(move_vel);
    const spin_vel = this.rot_vel * WHEEL_RADIUS;
    
    const v_long = car_vel.dot(wheel_dir);
    const v_lat = car_vel.dot(perp_wheel_dir);
    const alpha = Math.atan2(v_lat, Math.max(Math.abs(v_long), 1));
    
    this.slip_ratio = (spin_vel - move_vel) / Math.max(abs_move_vel, 30);
    this.slip_angle = alpha;
    
    const is_slip = (Math.abs(this.slip_ratio) > 0.06) ? 0.6 : 1.0;
    const is_slip2 = (Math.abs(this.slip_angle) > 0.1) ? 0.4 : 1.0;
    
    const F_traction = this.C_t * is_slip2 * clamp(this.slip_ratio, -0.1, 0.1);
    const F_lateral = -this.C_a * is_slip * clamp(this.slip_angle, -0.1, 0.1);
    
    const T_traction = F_traction * WHEEL_RADIUS;
    const T_total = T_drive - T_traction - T_brake * (spin_vel > 0 ? 1 : -1);
    
    const I_wheel = WHEEL_MASS * WHEEL_RADIUS * WHEEL_RADIUS / 2;
    
    if (handbrake) {
      this.rot_vel = 0;
    } else {
      const rot_accel = T_total / I_wheel;
      this.rot_vel += rot_accel * TIMESTEP;
      this.rot += this.rot_vel * TIMESTEP;
    }
    
    return wheel_dir.mulf(F_traction).add(perp_wheel_dir.mulf(F_lateral));
  }
  
  draw(pos, radius, car_rot)
  {
    const N = 4;
    
    for (let i = 0; i < N; i++) {
      const theta = Math.PI / N * i;
      
      const a_a = new vec3_t(-0.1, 0, -radius).rotate_x(this.rot + theta).rotate_y(this.dir + car_rot);
      const a_b = new vec3_t(+0.1, 0, -radius).rotate_x(this.rot + theta).rotate_y(this.dir + car_rot);
      
      const b_a = new vec3_t(-0.1, 0, +radius).rotate_x(this.rot + theta).rotate_y(this.dir + car_rot);
      const b_b = new vec3_t(+0.1, 0, +radius).rotate_x(this.rot + theta).rotate_y(this.dir + car_rot);
      
      pen3d.line(pos.add(a_a), pos.add(a_b));
      pen3d.line(pos.add(b_a), pos.add(b_b));
      
      pen3d.line(pos.add(a_a), pos.add(b_a));
      pen3d.line(pos.add(a_b), pos.add(b_b));
    }
  }
};

class car_t {
  constructor()
  {
    this.pos = new vec3_t(0, 0, 0);
    this.vel = new vec3_t(0, 0, 0.0);
    this.rot = 0.0;
    this.rot_vel = 0.0;
    this.wheel_rear = new wheel_t(0.0);
    this.wheel_front = new wheel_t(0.0);
    this.prev_accel = 0;
    this.gear = 0;
    this.x_g = gear_table[0];
    this.x_d = 4.24;
    this.throttle = 0;
    this.steer_dir = 0;
    
    this.clutch_rpm = 0;
    this.was_clutch = false;
    
    this.skids = [];
    this.skid_id = 0;
    for (let i = 0; i < 60; i++)
      this.skids[i] = new skid_t();
    
    this.particle_tick = 0;
  }
  
  integrate()
  {
    this.rot += this.rot_vel * TIMESTEP;
    this.pos = this.pos.add(this.vel.mulf(TIMESTEP));
  }
  
  steer(dir)
  {
    this.wheel_front.dir += dir;
  }
  
  shift_up()
  {
    if (this.gear < 5)
      this.set_gear(this.gear + 1);
  }
  
  shift_down()
  {
    if (this.gear > 0)
      this.set_gear(this.gear - 1);
  }
  
  set_gear(x_g)
  {
    this.gear = x_g;
    this.x_g = gear_table[x_g];
  }
  
  auto_gear()
  {
    const rpm = rot_vel_rpm(this.wheel_rear.rot_vel, this.x_g, this.x_d);
    
    if (rpm < 2000)
      this.shift_down();
    if (rpm > 4800)
      this.shift_up();
  }
  
  drive(throttle, handbrake, brake, clutch)
  {
    const vel_dir = this.vel.rotate_y(-this.rot);
    const vel_angle = Math.atan2(-vel_dir.x, vel_dir.z);
    const vel_steer = clamp(vel_angle - 0.12 * (vel_angle > 0 ? 1 : -1), -Math.PI / 3, Math.PI/3);
    
    if (Math.abs(this.wheel_rear.slip_angle) > 0.15)
      this.wheel_front.dir += 0.12*(vel_steer-this.wheel_front.dir);
    else
      this.wheel_front.dir += 0.2*(-this.wheel_front.dir);
    
    this.throttle = Math.min(this.throttle + 4.2 * throttle * TIMESTEP, 1.0);
    this.throttle = Math.max(this.throttle - 3.9 * this.throttle * TIMESTEP, 0);
    
    const car_dir = new vec3_t(0, 0, 1).rotate_y(this.rot);
    
    const W_f = 0.5 * 9.8 * CAR_MASS - 0.3 * CAR_MASS * this.prev_accel;
    const W_r = 0.5 * 9.8 * CAR_MASS + 0.3 * CAR_MASS * this.prev_accel;
    
    const I_car = CAR_MASS;
    
    const rpm = rot_vel_rpm(this.clutch_rpm, clutch ? 0.2 : this.x_g, this.x_d);
    const T_max = torque_rpm_curve(rpm);
    
    const volume = elem_volume.value / 100;
    
    if (oscillator) {
      oscillator.frequency.value = clamp(Math.floor((this.throttle * rpm - 1000) / 6000 * 300 + 50), 50, 400);
      gain_node.gain.value = clamp((this.throttle * rpm - 1000) / 6000 * 0.1 * throttle + 0.05, 0, 1.0) * volume;
      
      if (Math.abs(this.wheel_rear.slip_angle) > 0.2) {
        const interp = clamp((Math.abs(this.wheel_rear.slip_angle) - 0.2) / 0.2 * 0.1, 0, 1.0);
        slip_oscillator.frequency.value = Math.floor(300 + (1 - interp) * 200);
        slip_gain_node.gain.value = interp * 0.2 * volume;
      } else {
        slip_gain_node.gain.value = 0;
      }
    }
    
    const T_engine = this.throttle * T_max;
    const T_brake = brake ? 1000 : 0;
    const f_T_brake = brake ? 1000 : 0;
    
    let T_drive = T_engine * (clutch ? 8.0 : this.x_g) * this.x_d * 0.7;
    
    if (clutch) {
      const I_wheel = WHEEL_MASS * WHEEL_RADIUS * WHEEL_RADIUS / 2;
      if (rpm < 5000)
        this.clutch_rpm += T_drive / I_wheel * TIMESTEP;
      T_drive = 0;
      this.was_clutch = true;
    } else {
      if (this.was_clutch) {
        this.wheel_rear.rot_vel = this.clutch_rpm;
        this.was_clutch = false;
      }
      this.clutch_rpm = this.wheel_rear.rot_vel;
    }
    
    const r_vel = this.vel.add(new vec3_t(this.rot_vel * 0.5, 0, 0).rotate_y(this.rot));
    const r_F_traction = this.wheel_rear.apply_traction(r_vel, this.rot, W_r, T_drive, T_brake, handbrake);
    const r_T_traction = 0.5 * r_F_traction.cross(car_dir).y;
    
    const f_vel = this.vel.add(new vec3_t(-this.rot_vel * 0.5, 0, 0).rotate_y(this.rot));
    const f_F_traction = this.wheel_front.apply_traction(f_vel, this.rot, W_f, 0, f_T_brake, false);
    const f_T_traction = 0.5 * f_F_traction.cross(car_dir).y;
    
    const T_net = f_T_traction - r_T_traction;
    const I_net = T_net / I_car;
    
    const F_net = f_F_traction.add(r_F_traction);
    const accel_net = F_net.mulf(1.0 / CAR_MASS);
    
    this.prev_accel = accel_net.dot(car_dir);
    
    this.rot_vel += I_net * TIMESTEP;
    this.vel = this.vel.add(accel_net.mulf(TIMESTEP));
    
    graph_torque(rpm, this.x_g, this.x_d);
    
    if (this.particle_tick % 10 == 0) {
      debug.innerHTML = this.throttle.toFixed(4);
      elem_rpm.innerHTML = rpm.toFixed(4);
      elem_velocity.innerHTML = (this.vel.length() * 3.6).toFixed(4);
      elem_torque.innerHTML = T_drive.toFixed(4);
      elem_gear.innerHTML = this.gear + 1;
      elem_slip_ratio.innerHTML = this.wheel_rear.slip_ratio.toFixed(4);
      elem_slip_angle.innerHTML = (90 - Math.acos(Math.abs(this.wheel_rear.slip_angle)) * 180 / Math.PI).toFixed(4);
    }
  }
  
  play_particles()
  {
    this.particle_tick++;
    
    const car_dir = new vec3_t(0, 0, 1).rotate_y(this.rot);
    const perp_car_dir = new vec3_t(1, 0, 0).rotate_y(this.rot);
    const right = new vec3_t(0.5, 0, 0).rotate_y(this.rot);
    
    const car_pos = this.pos.sub(new vec3_t(0, 0.2, 0));
    
    const r_dir = new vec3_t(0, 0, -1.0).rotate_y(this.rot);
    const r_pos = car_pos.add(r_dir);
    
    const f_dir = new vec3_t(0, 0, 1.0).rotate_y(this.rot);
    const f_pos = car_pos.add(f_dir);
    
    const r_a = r_pos.sub(right);
    const r_b = r_pos.add(right);
    
    const f_a = f_pos.sub(right);
    const f_b = f_pos.add(right);
    
    if (this.particle_tick % 3 == 0) {
      if (Math.abs(this.wheel_rear.slip_angle) > 0.1 || Math.abs(this.wheel_rear.slip_ratio) > 0.06) {
        this.skids[this.skid_id].skid(r_a, perp_car_dir.mulf(0.1));
        this.skid_id = (this.skid_id + 1) % this.skids.length;
        this.skids[this.skid_id].skid(r_b, perp_car_dir.mulf(0.1));
        this.skid_id = (this.skid_id + 1) % this.skids.length;
      }
      
      if (Math.abs(this.wheel_front.slip_angle) > 0.1 || Math.abs(this.wheel_rear.slip_ratio) > 0.06) {
        this.skids[this.skid_id].skid(f_a, perp_car_dir.mulf(0.1));
        this.skid_id = (this.skid_id + 1) % this.skids.length;
        this.skids[this.skid_id].skid(f_b, perp_car_dir.mulf(0.1));
        this.skid_id = (this.skid_id + 1) % this.skids.length;
      }
    }
    
    for (const skids of this.skids) {
      skids.draw();
    }
  }
  
  draw()
  {
    const right = new vec3_t(0.5, 0, 0).rotate_y(this.rot);
    
    const r_dir = new vec3_t(0, 0, -1.0).rotate_y(this.rot);
    const r_pos = this.pos.add(r_dir);
    
    const f_dir = new vec3_t(0, 0, 1.0).rotate_y(this.rot);
    const f_pos = this.pos.add(f_dir);
    
    const r_a = r_pos.sub(right);
    const r_b = r_pos.add(right);
    
    const f_a = f_pos.sub(right);
    const f_b = f_pos.add(right);
    
    const hood = car.pos.add(new vec3_t(0, 0.6, -0.3).rotate_y(this.rot));
    pen3d.line(r_a, hood);
    pen3d.line(r_b, hood);
    pen3d.line(f_a, hood);
    pen3d.line(f_b, hood);
    
    pen3d.line(r_pos, f_pos);
    pen3d.circle(this.pos, 0.1);
    this.wheel_rear.draw(r_a, 0.2, this.rot);
    this.wheel_rear.draw(r_b, 0.2, this.rot);
    
    this.wheel_front.draw(f_a, 0.2, this.rot);
    this.wheel_front.draw(f_b, 0.2, this.rot);
    
    pen3d.line(r_a, r_b);
    pen3d.line(f_a, f_b);
    
    pen3d.line(r_a, f_a);
    pen3d.line(r_b, f_b);
  }
};

let car = new car_t();
let fn_draw_track = draw_track;
let scene_model = [];

function draw_track()
{
  for (let y = -200; y < 200; y += 50) {
    for (let x = -200; x < 200; x += 50) {
      pen3d.circle(new vec3_t(x, 3, y), 3);
    }
  }
  
  for (let y = -200; y < 200; y += 5) {
    for (let x = -200; x < 200; x += 5) {
      const pos = new vec3_t(x, 0, y);
      const right = new vec3_t(1, 0, 0);
      const forward = new vec3_t(0.0, 0, 1);
      
      pen3d.line(pos.sub(right), pos.add(right));
      pen3d.line(pos.sub(forward), pos.add(forward));
    }
  }
}

function draw_drag()
{
  for (let y = 0; y < 1000; y += 50) {
    pen3d.circle(new vec3_t(-20, 3, y), 3);
    pen3d.circle(new vec3_t(+20, 3, y), 3);
  }
  
  for (let y = 0; y < 1000; y += 5) {
    for (let x = -20; x < 20; x += 5) {
      const pos = new vec3_t(x, 0, y);
      const right = new vec3_t(1, 0, 0);
      const forward = new vec3_t(0.0, 0, 1);
      
      pen3d.line(pos.sub(right), pos.add(right));
      pen3d.line(pos.sub(forward), pos.add(forward));
    }
  }
}

function orient_cam()
{
  const vel_dir = car.vel.normalize().add(new vec3_t(0, 0, 10.0).rotate_y(car.rot));
  camera.rot.y = Math.atan2(-vel_dir.x, vel_dir.z);
  camera.rot.x = 0.01;
  camera.pos = car.pos.add(new vec3_t(0, 1.2, -2.8).rotate_y(camera.rot.y));
}

function draw_mesh(mesh)
{
  for (const face of mesh.faces) {
    pen3d.line(face.vertices[0], face.vertices[1]);
    pen3d.line(face.vertices[1], face.vertices[2]);
    pen3d.line(face.vertices[2], face.vertices[0]);
  }
}

function draw_model(model)
{
  for (const mesh of model.meshes)
    draw_mesh(mesh);
}

function update()
{
  pen.clear();
  pen.begin()
  
  if (input.get_key(key.code("R")))
    car = new car_t();
  
  const throttle = (input.get_key(key.code("W")) ? 1.0 : 0);
  const brake = (input.get_key(key.code("S")) ? 1.0 : 0);
  const handbrake = input.get_key(key.code(" "));
  const clutch = input.get_key(key.SHIFT);
  
  if (input.get_key(key.code("A")))
    car.steer(+0.03);
  if (input.get_key(key.code("D")))
    car.steer(-0.03);
  
  /*
  car.wheel_front.dir = -input.get_mouse_pos().x * 0.6;
  
  const throttle = (input.get_mouse_down(0) ? 1.0 : 0);
  const handbrake = input.get_key(key.code("Q"));
  const clutch = input.get_key(key.code("C"));
  const brake = (input.get_mouse_down(2) ? 1.0 : 0);
  */
  
  if (elem_auto_gear.checked)
    car.auto_gear();
  car.drive(throttle, handbrake, brake, clutch);
  car.integrate();
  
  orient_cam();
  
  car.draw();
  car.play_particles();
  fn_draw_track();
  
  pen.stroke();
  
}

(function() {
  input.bind(key.code("J"), () => {
    car.shift_down();
  }, () => {});
  
  input.bind(key.code("K"), () => {
    car.shift_up();
  }, () => {});
  
  document.getElementById("flat").onclick = function () {
    car = new car_t();
    fn_draw_track = draw_track;
  };
  
  document.getElementById("track_1").onclick = function () {
    car = new car_t();
    fn_draw_track = () => draw_model(scene_model[0]);
  };
  
  document.getElementById("track_2").onclick = function () {
    car = new car_t();
    fn_draw_track = () => draw_model(scene_model[1]);
  };
  
  document.getElementById("track_3").onclick = function () {
    car = new car_t();
    fn_draw_track = () => draw_model(scene_model[2]);
  };
  
  document.getElementById("drag").onclick = function () {
    car = new car_t();
    fn_draw_track = draw_drag;
  };
  
  obj_load("scene.obj", (model) => { scene_model[0] = model; });
  obj_load("scene_2.obj", (model) => { scene_model[1] = model; });
  obj_load("scene_3.obj", (model) => { scene_model[2] = model; });
  
  setInterval(function () {
    update();
  }, TIMESTEP * 1000);
})();
