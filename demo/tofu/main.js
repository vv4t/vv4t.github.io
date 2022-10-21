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

const CAR_MASS = 500;
const WHEEL_MASS = 75;
const WHEEL_RADIUS = 0.34;

const elem_torque = document.getElementById("torque");
const elem_velocity = document.getElementById("velocity");
const elem_rpm = document.getElementById("rpm");
const elem_slip_ratio = document.getElementById("slip_ratio");
const elem_slip_angle = document.getElementById("slip_angle");
const elem_gear_ratio = document.getElementById("gear_ratio");
const elem_time = document.getElementById("time");

function torque_rpm_curve(rpm)
{
  const x = rpm - 2000;
  return -0.000025 * x*x + 350;
}

function rot_vel_rpm(rot_vel, x_g, x_d)
{
  return Math.max(rot_vel * x_g * x_d * 60 / (2 * Math.PI), 1000);
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
  
  apply_traction(car_vel, car_rot, weight, T_drive, brake)
  {
    const C_t = 10000;
    const C_a = 5000;
    
    const mu = 1.0;
    const F_max = mu * weight;
    
    const wheel_dir = new vec3_t(0, 0, 1).rotate_y(this.dir + car_rot);
    const perp_wheel_dir = new vec3_t(1, 0, 0).rotate_y(this.dir + car_rot);
    
    const move_vel = wheel_dir.dot(car_vel);
    const abs_move_vel = Math.abs(move_vel);
    const spin_vel = this.rot_vel * WHEEL_RADIUS;
    
    const slip_ratio = (spin_vel - move_vel) / Math.max(abs_move_vel, 5);
    const slip_angle = perp_wheel_dir.dot(car_vel.normalize());
    
    this.slip_scale = Math.abs(slip_ratio * slip_angle) / 0.03;
    
    if (T_drive > 0) {
      elem_torque.innerHTML = T_drive.toFixed(4);
      elem_slip_ratio.innerHTML = slip_ratio.toFixed(4);
      elem_slip_angle.innerHTML = (90 - Math.acos(Math.abs(slip_angle)) * 180 / Math.PI).toFixed(4);
    }
    
    const F_lateral = clamp(-C_a * slip_angle, -16000, 16000);
    const F_traction = clamp(C_t * slip_ratio, -F_max, F_max);
    
    const T_traction = F_traction * WHEEL_RADIUS;
    const T_total = T_drive - T_traction;
    
    const I_wheel = WHEEL_MASS * WHEEL_RADIUS * WHEEL_RADIUS / 2;
    
    if (brake) {
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
    pen3d.circle(pos, radius);
    
    const front_wheel_a = new vec3_t(0, 0, radius * 1.5).rotate_y(this.dir + car_rot);
    const front_wheel_b = new vec3_t(0, 0, -radius * 1.5).rotate_y(this.dir + car_rot);
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
    this.vel = new vec3_t(0, 0, 2.0);
    this.rot = -0.0;
    this.rot_vel = 0.0;
    this.wheel_rear = new wheel_t(0.0);
    this.wheel_front = new wheel_t(0.0);
    this.prev_accel = 0;
    this.gear_table = [
      2.66,
      1.78,
      1.30,
      1.0,
      0.74,
      0.50
    ];
    this.x_g = this.gear_table[0];
    this.x_d = 3.42;
    
    this.particles = [];
    this.particle_tick = 0;
    this.particle_id = 0;
    for (let i = 0; i < 30; i++)
      this.particles[i] = new particle_t();
    
    elem_gear_ratio.innerHTML = this.x_g.toFixed(4);
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
  
  set_gear(x_g)
  {
    this.x_g = this.gear_table[x_g];
    elem_gear_ratio.innerHTML = this.x_g.toFixed(4);
  }
  
  drive(throttle, brake)
  {
    this.wheel_front.dir -= 0.2 * this.wheel_front.dir;
    
    const car_dir = new vec3_t(0, 0, 1).rotate_y(this.rot);
    
    const W_f = 9.8 * CAR_MASS - 0.3 * CAR_MASS * this.prev_accel;
    const W_r = 9.8 * CAR_MASS + 0.3 * CAR_MASS * this.prev_accel;
    
    const I_car = 1/12 * CAR_MASS;
    
    const rpm = rot_vel_rpm(this.wheel_rear.rot_vel, this.x_g, this.x_d);
    const T_max = torque_rpm_curve(rpm);
    const T_engine = throttle * T_max;
    const T_drive = T_engine * this.x_g * this.x_d;
    
    const r_vel = this.vel.add(new vec3_t(this.rot_vel, 0, 0).rotate_y(this.rot));
    const r_F_traction = this.wheel_rear.apply_traction(this.vel, this.rot, W_r, T_drive, brake);
    const r_T_traction = r_F_traction.cross(car_dir).y;
    
    const f_vel = this.vel.add(new vec3_t(-this.rot_vel, 0, 0).rotate_y(this.rot));
    const f_F_traction = this.wheel_front.apply_traction(f_vel, this.rot, W_f, 0, false);
    const f_T_traction = f_F_traction.cross(car_dir).y;
    
    const T_net = f_T_traction - r_T_traction;
    const I_net = T_net / I_car;
    
    const F_net = f_F_traction.add(r_F_traction);
    const accel_net = F_net.mulf(1.0 / CAR_MASS);
  
    this.prev_accel = accel_net.dot(car_dir);
    
    this.rot_vel += I_net * TIMESTEP;
    this.vel = this.vel.add(accel_net.mulf(TIMESTEP));
    
    elem_rpm.innerHTML = rpm.toFixed(4);
    elem_velocity.innerHTML = (this.vel.length()).toFixed(4);
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
    
    this.wheel_front.draw(f_a, 0.3, this.rot);
    this.wheel_front.draw(f_b, 0.3, this.rot);
    
    pen3d.line(r_a, r_b);
    pen3d.line(f_a, f_b);
    
    pen3d.line(r_a, f_a);
    pen3d.line(r_b, f_b);
  }
};

let car = new car_t();
let fn_draw_track = draw_track;
let scene_model;

function draw_track()
{
  for (let y = -200; y < 200; y += 50) {
    for (let x = -200; x < 200; x += 50) {
      pen3d.circle(new vec3_t(x, 3, y), 3);
    }
  }
  
  for (let y = -200; y < 200; y += 6) {
    for (let x = -200; x < 200; x += 6) {
      const pos = new vec3_t(x, 0, y);
      const right = new vec3_t(0.5, 0, 0);
      const forward = new vec3_t(0.0, 0, 0.5);
      
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
    car.steer(+0.03);
  if (input.get_key(key.code("D")))
    car.steer(-0.03);
  
  if (input.get_key(key.code("I")))
    car.set_gear(0);
  if (input.get_key(key.code("O")))
    car.set_gear(1);
  if (input.get_key(key.code("P")))
    car.set_gear(2);
  if (input.get_key(key.code("J")))
    car.set_gear(3);
  if (input.get_key(key.code("K")))
    car.set_gear(4);
  if (input.get_key(key.code("L")))
    car.set_gear(5);
  
  const throttle = input.get_key(key.code("W")) ? 1 : 0;
  const brake = input.get_key(key.code(" "));
  
  car.drive(throttle, brake);
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
  document.getElementById("playground").onclick = function () {
    car = new car_t();
    fn_draw_track = draw_track;
  };
  
  document.getElementById("track").onclick = function () {
    car = new car_t();
    fn_draw_track = () => draw_model(scene_model);
  };
  
  obj_load("scene.obj", (model) => {
    console.log(model);
    scene_model = model;
    setInterval(function () {
      update();
    }, TIMESTEP * 1000);
  });
})();
