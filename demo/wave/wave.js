"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";

const canvas = document.getElementById("canvas");
const pen = new pen_t(canvas);
const input = new input_t(canvas);

class bob_t {
  constructor(u, u_t)
  {
    this.u = u;
    this.u_t = u_t;
    this.u_0 = u;
  }
};

const BOB_SIZE = 0.005;
const BOB_NUM = 500;
const bob_arr = [];

const bob_centre = BOB_NUM * BOB_SIZE * 0.5;

function reset_bob() {
  bob_arr.length = 0;
  for (let i = 0; i < BOB_NUM; i++)
    bob_arr.push(new bob_t(0.0, 0.0));
  
  const n = 70;
  
  for (let i = 1; i < n; i++) {
    const theta = (i - 1) / n * Math.PI;
    
    const sine = Math.sin(theta) * 0.3;
    const cosine = Math.cos(theta) * 0.3 / n * 49 * Math.sqrt(c);
    
    const u = sine;
    const u_t = cosine;
    
    bob_arr[i].u = u;
    bob_arr[i].u_t = u + u_t * k;
  }
}

const TIMESTEP = 0.015;

const c = 2.7;
const h = 0.1;
const k = 0.015;

const tau = Math.pow((c*k)/h,2);

let t = 0.0;
let stop = false;

document.getElementById("stop").addEventListener("click", () => {
  stop = true;
});

document.getElementById("start").addEventListener("click", () => {
  stop = false;
});

document.getElementById("reset").addEventListener("click", reset_bob);

const c_range = document.getElementById("c");

reset_bob();

setInterval(function() {
  t += TIMESTEP;
  
  if (input.get_mouse_down()) {
    const mouse_pos = input.get_mouse_pos();
    const bob_num = clamp(Math.floor((mouse_pos.x + bob_centre) / BOB_SIZE), 1, bob_arr.length - 2);
    bob_arr[bob_num].u = mouse_pos.y;
  }
  
  pen.clear();
  pen.begin();
  
  if (!stop) {
    for (let i = 1; i < bob_arr.length - 1; i++) {
      const u = bob_arr[i].u;
      const u_t = bob_arr[i].u_t;
      
      const du_dx_1 = bob_arr[i + 1].u - u;
      const du_dx_2 = u - bob_arr[i - 1].u;
      
      const d2u_dx2 = du_dx_1 - du_dx_2;
      
      const u_0 = 2 * u - u_t + tau * d2u_dx2;
      
      bob_arr[i].u_0 = u_0;
    }
    
    for (const bob of bob_arr) {
      bob.u_t = bob.u;
      bob.u = bob.u_0;
    }
  }
  
  for (let i = 0; i < bob_arr.length - 1; i++) {
    const bob_a = new vec2_t(i * BOB_SIZE - bob_centre, bob_arr[i].u);
    const bob_b = new vec2_t((i + 1) * BOB_SIZE - bob_centre, bob_arr[i + 1].u);
    
    pen.circle(bob_a, BOB_SIZE * 0.5);
    pen.line(bob_a, bob_b);
  }

  pen.stroke();
}, TIMESTEP * 1000);
