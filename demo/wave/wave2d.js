"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { rand, clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera);
const input = new input_t(canvas);

const TIMESTEP = 0.015;
const BOB_NUM = 100;
const RADIUS = 1.0;

const c = 0.7;
const h = 0.1;
const k = 0.015;

const tau = Math.pow((c*k)/h,2);

const c_range = document.getElementById("c");

let stop = false;

class bob_t {
  constructor(u, u_t)
  {
    this.u = u;
    this.u_t = u_t;
    this.u_0 = u;
  }
};

const bob_arr = [];

function get_C()
{
  return c_range.value * 0.1;
}

function start()
{
  reset();
}

function update()
{
  pen.clear();
  pen.begin();
  
  free_move();
  free_look();
  
  if (input.get_key(key.code(" "))) {
    const front_offset = new vec3_t(0, 0, 5).rotate_zxy(camera.rot);
    const front_pos = camera.pos.add(front_offset);
    
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const x = clamp(Math.floor(front_pos.x + i), 1, BOB_NUM - 2);
        const y = clamp(Math.floor(front_pos.z + j), 1, BOB_NUM - 2);
        
        bob_arr[y][x].u = front_pos.y;
        bob_arr[y][x].u_t = front_pos.y;
      }
    }
  }
  
  if (!stop) {
    for (let y = 1; y < BOB_NUM - 1; y++) {
      for (let x = 1; x < BOB_NUM - 1; x++) {
        const u = bob_arr[y][x].u;
        const u_t = bob_arr[y][x].u_t;
        
        const du_dx_1 = u - bob_arr[y][x - 1].u;
        const du_dy_1 = u - bob_arr[y - 1][x].u;
        
        const du_dx_2 = bob_arr[y][x + 1].u - u;
        const du_dy_2 = bob_arr[y + 1][x].u - u;
        
        const d2u_dx2 = du_dx_2 - du_dx_1;
        const d2u_dy2 = du_dy_2 - du_dy_1;
        
        const d_t = 0.015;
        
        const d2u_dt2 = (d2u_dx2 + d2u_dy2);
        
        const u_0 = 2 * u - u_t + tau * d2u_dt2;
        
        bob_arr[y][x].u_0 = u_0;
      }
    }
    
    for (const row of bob_arr) {
      for (const bob of row) {
        bob.u_t = bob.u;
        bob.u = bob.u_0;
      }
    }
  }
  
  for (let y = 0; y < BOB_NUM - 1; y++) {
    for (let x = 0; x < BOB_NUM - 1; x++) {
      const s = 10;
      const a = new vec3_t(x, bob_arr[y][x].u*s, y);
      const b = new vec3_t(x + 1, bob_arr[y][x + 1].u*s, y);
      const c = new vec3_t(x, bob_arr[y + 1][x].u*s, y + 1);
      const d = new vec3_t(x + 1, bob_arr[y + 1][x + 1].u*s, y + 1);
      
      // pen3d.circle(a, 0.1);
      pen3d.line(a, b);
      pen3d.line(a, c);
    }
  }
  
  pen.stroke();
}

function free_move()
{
  let move_dir = new vec3_t();
  
  if (input.get_key(key.code("W")))
    move_dir = move_dir.add(new vec3_t(0, 0, +1));
  if (input.get_key(key.code("A")))
    move_dir = move_dir.add(new vec3_t(-1, 0, 0));
  if (input.get_key(key.code("S")))
    move_dir = move_dir.add(new vec3_t(0, 0, -1));
  if (input.get_key(key.code("D")))
    move_dir = move_dir.add(new vec3_t(+1, 0, 0));
  
  camera.pos = camera.pos.add(move_dir.rotate_zxy(camera.rot).mulf(15 * TIMESTEP));
}

function free_look()
{
  const sensitivity = 0.6;
  
  if (input.lock_status()) {
    camera.rot.x = -input.get_mouse_pos().y * 2 * Math.PI * sensitivity;
    camera.rot.y = -input.get_mouse_pos().x * 2 * Math.PI * sensitivity;
  } else if (input.get_mouse_down()) {
    input.lock();
  }
}

function reset()
{
  bob_arr.length = 0;
  
  for (let i = 0; i < BOB_NUM; i++) {
    const row = [];
    for (let j = 0; j < BOB_NUM; j++)
      row.push(new bob_t(0.0, 0.0));
    
    bob_arr.push(row);
  }
  
  const n = 30;
  
  for (let i = 0; i < n*2; i++) {
    for (let j = 0; j < n*2; j++) {
      const x = i - n;
      const y = j - n;
      
      const t = Math.sqrt(x*x + y*y);
      
      if (t < 5 || t > n)
        continue;
      
      const theta = (t - 5) / (n-5) * Math.PI;
      
      const u = 0.6 * Math.sin(theta);
      const u_t = -0.6 * Math.cos(theta) / n * Math.sqrt(c);
      
      const e = BOB_NUM/2 - n;
      
      bob_arr[i+e][j+e].u = u;
      bob_arr[i+e][j+e].u_t = u + u_t * k;
    }
  }
  
  stop = true;
}

class sphere_t {
  constructor(pos, vel)
  {
    this.pos = pos;
    this.vel = vel;
  }
  
  apply_gravity()
  {
    this.vel.y -= 20 * TIMESTEP;
  }
  
  update()
  {
    this.apply_gravity();
    this.integrate();
    this.clip_wave();
    this.clip_bound();
  }
  
  clip_bound()
  {
    if (this.pos.x - RADIUS < 0) {
      this.pos.x = RADIUS;
      this.vel.x = 0;
    }
    
    if (this.pos.x + RADIUS >= BOB_NUM) {
      this.pos.x = BOB_NUM - RADIUS;
      this.vel.x = 0;
    }
    
    if (this.pos.z - RADIUS < 0) {
      this.pos.z = RADIUS;
      this.vel.z = 0;
    }
    
    if (this.pos.z + RADIUS >= BOB_NUM) {
      this.pos.z = BOB_NUM - RADIUS;
      this.vel.z = 0;
    }
  }
  
  clip_wave()
  {
    const x = clamp(Math.floor(this.pos.x), 1, BOB_NUM - 2);
    const y = clamp(Math.floor(this.pos.z), 1, BOB_NUM - 2);
    
    const a = new vec3_t(x, bob_arr[y][x].u, y);
    const b = new vec3_t(x + 1, bob_arr[y][x + 1].u, y);
    const c = new vec3_t(x, bob_arr[y + 1][x].u, y + 1);
    
    const ab = b.sub(a);
    const ac = c.sub(a);
    
    const n = ac.cross(ab);
    const d = a.dot(n);
    
    const p_d = this.pos.dot(n) - d - RADIUS;
    
    if (p_d < 0) {
      const beta = p_d * 0.1 / TIMESTEP;
      const lambda = -(n.dot(this.vel) + beta);
      const d_v = n.mulf(lambda);
      this.vel = this.vel.add(d_v);
    }
  }
  
  integrate()
  {
    this.pos = this.pos.add(this.vel.mulf(TIMESTEP));
  }
  
  draw()
  {
    const p_x = new vec3_t(1, 0, 0);
    const p_y = new vec3_t(0, 1, 0);
    const p_z = new vec3_t(0, 0, 1);
    
    const x_a = this.pos.add(p_x);
    const x_b = this.pos.sub(p_x);
    
    const y_a = this.pos.add(p_y);
    const y_b = this.pos.sub(p_y);
    
    const z_a = this.pos.add(p_z);
    const z_b = this.pos.sub(p_z);
    
    pen3d.circle(this.pos, 1);
    pen3d.line(x_a, x_b);
    pen3d.line(y_a, y_b);
    pen3d.line(z_a, z_b);
  }
};

start();

setInterval(function() {
  update();  
}, TIMESTEP * 1000);

document.getElementById("stop").addEventListener("click", () => stop = true);
document.getElementById("start").addEventListener("click", () => stop = false);
document.getElementById("reset").addEventListener("click", reset);

