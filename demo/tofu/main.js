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
    slip_oscillator.type = "sine";
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
      
      const y_a = torque_a / scale_y;
      const y_b = torque_b / scale_y;
      
      pen_torque.line(new vec2_t(x_h_a, y_a), new vec2_t(x_h_b, y_b));
    }
  }
  
  const c_torque = torque_rpm_curve(rpm) * x_g * x_d;
  const c_x = rpm / x_g / x_d / scale_x * 1.8 - 0.9;
  const c_y = c_torque / scale_y;
  
  const d_rpm = rpm - prev_rpm;
  const d_torque_rpm = (torque_rpm_curve(rpm) * x_g * x_d - torque_rpm_curve(prev_rpm) * x_g * x_d) / Math.abs(d_rpm);
  
  pen_torque.line(new vec2_t(c_x, c_y), new vec2_t(c_x, c_y).add(new vec2_t(0.1 * d_rpm / Math.abs(d_rpm), 0.1 * d_torque_rpm)));
  pen_torque.circle(new vec2_t(c_x, c_y), 0.02);
  
  prev_rpm = rpm;
  
  pen_torque.stroke();
}

function torque_rpm_curve(rpm)
{
  const max_rpm = 5500;
  if (rpm > max_rpm) {
    const max_rpm_torque = -0.000025 * max_rpm * max_rpm + 400;
    return Math.max(-4 * (rpm - 5500) + max_rpm_torque, -2000);
  }
  
  const x = rpm - 3000;
  return -0.000025 * x*x + 400;
}

function rot_vel_rpm(rot_vel, x_g, x_d)
{
  return Math.max(Math.abs(rot_vel * x_g * x_d * 60 / (2 * Math.PI)), 1000);
}

class particle_t {
  constructor(pos, life, vel)
  {
    this.pos = pos;
    this.vel = vel;
    this.life = life;
  }
  
  shoot(origin, dir)
  {
    this.pos = origin;
    this.vel = dir;
    this.life = 50;
  }
  
  update()
  {
    this.pos = this.pos.add(this.vel.mulf(TIMESTEP));
    this.vel.y -= 9.8 * TIMESTEP;
    this.life--;
  }
  
  draw()
  {
    pen3d.circle(this.pos, 0.02);
  }
};

class wheel_t {
  constructor(dir)
  {
    this.dir = dir;
    this.rot = 0;
    this.rot_vel = 0;
    this.slip_scale = 0;
  }
  
  apply_traction(car_vel, car_rot, weight, T_drive, T_brake, handbrake)
  {
    const C_t = 10000;
    const C_a = 8000;
    
    const mu = 1.0;
    const F_max = mu * weight;
    
    const wheel_dir = new vec3_t(0, 0, 1).rotate_y(this.dir + car_rot);
    const perp_wheel_dir = new vec3_t(1, 0, 0).rotate_y(this.dir + car_rot);
    
    const move_vel = wheel_dir.dot(car_vel);
    const abs_move_vel = Math.abs(move_vel);
    const spin_vel = this.rot_vel * WHEEL_RADIUS;
    
    const slip_ratio = (spin_vel - move_vel) / Math.max(abs_move_vel, 5);
    const slip_angle = perp_wheel_dir.dot(car_vel) / Math.max(1, car_vel.length());
    this.slip_angle = slip_angle;
    
    this.slip_scale = ( + Math.abs(slip_angle)) / 0.2;
    
    if (T_drive > 0) {
      elem_slip_ratio.innerHTML = slip_ratio.toFixed(4);
      elem_slip_angle.innerHTML = (90 - Math.acos(Math.abs(slip_angle)) * 180 / Math.PI).toFixed(4);
    }
    
    const F_lateral = -slip_angle * C_a;
    const F_traction = clamp(C_t * slip_ratio, -F_max, F_max);
    
    const T_traction = F_traction * WHEEL_RADIUS;
    const T_total = T_drive - T_traction - T_brake;
    
    const I_wheel = WHEEL_MASS * WHEEL_RADIUS * WHEEL_RADIUS / 2;
    
    if (handbrake) {
      this.rot_vel = 0;
    } else {
      const rot_accel = T_total / I_wheel;
      this.rot_vel += rot_accel * TIMESTEP;
      this.rot += this.rot_vel * TIMESTEP;
    }
    
    return wheel_dir.mulf(F_traction).add(perp_wheel_dir.mulf(F_lateral * Math.cos(this.dir)));
  }
  
  draw(pos, radius, car_rot)
  {
    pen3d.circle(pos, radius);
    
    const front_wheel_a = new vec3_t(0, 0, radius * 1.5).rotate_y(this.dir * 3 + car_rot);
    const front_wheel_b = new vec3_t(0, 0, -radius * 1.5).rotate_y(this.dir * 3 + car_rot);
    const front_wheel_axis_a = new vec3_t(-radius, 0.0, 0).rotate_y(this.rot);
    const front_wheel_axis_b = new vec3_t(radius, 0.0, 0).rotate_y(this.rot);
    
    pen3d.line(pos.add(front_wheel_a), pos.add(front_wheel_b));
    pen3d.line(pos.add(front_wheel_axis_a), pos.add(front_wheel_axis_b));
  }
};

class car_t {
  constructor()
  {
    this.pos = new vec3_t(0, 0, 0);
    this.vel = new vec3_t(0, 0, 0.0);
    this.rot = -0.0;
    this.rot_vel = 0.0;
    this.wheel_rear = new wheel_t(0.0);
    this.wheel_front = new wheel_t(0.0);
    this.prev_accel = 0;
    this.gear = 0;
    this.x_g = gear_table[0];
    this.x_d = 4.24;
    this.prev_rpm = 0;
    this.gear_tick = 0;
    
    this.particles = [];
    this.particle_tick = 0;
    this.particle_id = 0;
    for (let i = 0; i < 30; i++)
      this.particles[i] = new particle_t();
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
    this.gear_tick++;
    
    const rpm = rot_vel_rpm(this.wheel_rear.rot_vel, this.x_g, this.x_d);
    
    if (rpm < 2000)
      this.shift_down();
    if (rpm > 4200)
      this.shift_up();
  }
  
  drive(throttle, handbrake, brake)
  {
    if (Math.abs(this.wheel_rear.slip_angle) > 0.3) {
      const vel_dir = this.vel.rotate_y(-this.rot);
      const vel_rot = Math.atan2(-vel_dir.x, vel_dir.z);
      
      this.wheel_front.dir += 0.12 * (vel_rot * 0.06 - this.wheel_front.dir);
    } else {
      this.wheel_front.dir += 0.12 * (-this.wheel_front.dir);
    }
    
    const car_dir = new vec3_t(0, 0, 1).rotate_y(this.rot);
    
    const W_f = 9.8 * CAR_MASS - 0.3 * CAR_MASS * this.prev_accel;
    const W_r = 9.8 * CAR_MASS + 0.3 * CAR_MASS * this.prev_accel;
    
    const I_car = 1/12 * CAR_MASS;
    
    const rpm = rot_vel_rpm(this.wheel_rear.rot_vel, this.x_g, this.x_d);
    const T_max = torque_rpm_curve(rpm);
    
    const volume = elem_volume.value / 100;
    
    if (oscillator) {
      oscillator.frequency.value = Math.floor((rpm - 1000) / 6000 * 400 + 100);
      gain_node.gain.value = ((rpm - 1000) / 6000 * 0.1 * throttle + 0.05) * volume;
      
      if (this.wheel_rear.slip_scale > 1.0) {
        const interp = clamp((this.wheel_rear.slip_scale - 1.0) * 0.1, 0, 1.0);
        slip_oscillator.frequency.value = Math.floor(100 + (1 - interp) * 200);
        slip_gain_node.gain.value = interp * 0.5 * volume;
      } else {
        slip_gain_node.gain.value = 0;
      }
    }
    
    let T_engine = throttle * T_max;
    let T_brake = 0;
    let f_T_brake = 0;
    
    if (brake) {
      if (this.wheel_rear.rot_vel < 0) {
          T_engine = -T_max * 0.8;
          this.set_gear(0);
      } else {
        T_brake = 3000;
        f_T_brake = 3000;
      }
    }
    
    const T_drive = T_engine * this.x_g * this.x_d * 0.7;
    
    const r_vel = this.vel.add(new vec3_t(this.rot_vel, 0, 0).rotate_y(this.rot));
    const r_F_traction = this.wheel_rear.apply_traction(this.vel, this.rot, W_r, T_drive, T_brake, handbrake);
    const r_T_traction = r_F_traction.cross(car_dir).y;
    
    const f_vel = this.vel.add(new vec3_t(-this.rot_vel, 0, 0).rotate_y(this.rot));
    const f_F_traction = this.wheel_front.apply_traction(f_vel, this.rot, W_f, 0, f_T_brake, false);
    const f_T_traction = f_F_traction.cross(car_dir).y;
    
    const T_net = f_T_traction - r_T_traction;
    const I_net = T_net / I_car;
    
    const F_net = f_F_traction.add(r_F_traction);
    const accel_net = F_net.mulf(1.0 / CAR_MASS);
  
    this.prev_accel = accel_net.dot(car_dir);
    
    this.rot_vel += I_net * TIMESTEP;
    this.vel = this.vel.add(accel_net.mulf(TIMESTEP));
    
    graph_torque(rpm, this.x_g, this.x_d);
    
    elem_rpm.innerHTML = rpm.toFixed(4);
    elem_velocity.innerHTML = (this.vel.length() * 3.6).toFixed(4);
    elem_torque.innerHTML = T_drive.toFixed(4);
    elem_gear.innerHTML = this.gear + 1;
  }
  
  play_particles()
  {
    this.particle_tick++;
    
    const right = new vec3_t(0.5, 0, 0).rotate_y(this.rot);
    
    const r_dir = new vec3_t(0, 0, -1.0).rotate_y(this.rot);
    const r_pos = this.pos.add(r_dir);
    
    const f_dir = new vec3_t(0, 0, 1.0).rotate_y(this.rot);
    const f_pos = this.pos.add(f_dir);
    
    const r_a = r_pos.sub(right);
    const r_b = r_pos.add(right);
    
    const f_a = f_pos.sub(right);
    const f_b = f_pos.add(right);
    
    if (this.particle_tick % 3 == 0) {
      if (this.wheel_rear.slip_scale > 1.0) {
        this.particles[this.particle_id].shoot(r_a, new vec3_t(rand() * 5, 6, rand() * 5));
        this.particle_id = (this.particle_id + 1) % this.particles.length;
        this.particles[this.particle_id].shoot(r_b, new vec3_t(rand() * 5, 6, rand() * 5));
        this.particle_id = (this.particle_id + 1) % this.particles.length;
      }
      
      if (this.wheel_front.slip_scale > 1.0) {
        this.particles[this.particle_id].shoot(f_a, new vec3_t(rand() * 5, 5, rand() * 5));
        this.particle_id = (this.particle_id + 1) % this.particles.length;
        this.particles[this.particle_id].shoot(f_b, new vec3_t(rand() * 5, 5, rand() * 5));
        this.particle_id = (this.particle_id + 1) % this.particles.length;
      }
    }
    
    for (const particle of this.particles) {
      if (particle.life > 0) {
        particle.update();
        particle.draw();
      }
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
    
    const hood = car.pos.add(new vec3_t(0, 1, 0));
    pen3d.line(r_a, hood);
    pen3d.line(r_b, hood);
    pen3d.line(f_a, hood);
    pen3d.line(f_b, hood);
    
    pen3d.line(r_pos, f_pos);
    pen3d.circle(this.pos, 0.1);
    this.wheel_rear.draw(r_a, 0.3, this.rot);
    this.wheel_rear.draw(r_b, 0.3, this.rot);
    
    const vel_dir = this.vel.rotate_y(-this.rot);
    const vel_rot = Math.atan2(-vel_dir.x, vel_dir.z);
    
    this.wheel_front.draw(f_a, 0.3, this.rot + vel_rot * 0.5);
    this.wheel_front.draw(f_b, 0.3, this.rot + vel_rot * 0.5);
    
    pen3d.line(r_a, r_b);
    pen3d.line(f_a, f_b);
    
    pen3d.line(r_a, f_a);
    pen3d.line(r_b, f_b);
  }
};

let car = new car_t();
let fn_draw_track = draw_drag;
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
  const vel_dir = car.vel.normalize().add(new vec3_t(0, 0, 2.0).rotate_y(car.rot));
  camera.rot.y = Math.atan2(-vel_dir.x, vel_dir.z);
  camera.pos = car.pos.add(new vec3_t(0, 2, -4.5).rotate_y(camera.rot.y));
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
  if (input.get_key(key.code("R")))
    car = new car_t();
  
  if (input.get_key(key.code("A")))
    car.steer(+0.02);
  if (input.get_key(key.code("D")))
    car.steer(-0.02);
  
  const throttle = input.get_key(key.code("W")) ? 2.0 : 0;
  const handbrake = input.get_key(key.code(" "));
  const brake = input.get_key(key.code("S"));
  
  if (elem_auto_gear.checked)
    car.auto_gear();
  car.drive(throttle, handbrake, brake);
  car.integrate();
  
  orient_cam();
  
  pen.clear();
  pen.begin();
  
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
