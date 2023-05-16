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
  }
};

const BOB_SIZE = 0.025;
const BOB_NUM = 100;
const bob_arr = [];

const bob_centre = BOB_NUM * BOB_SIZE * 0.5;

function reset_bob() {
  bob_arr.length = 0;
  for (let i = 0; i < BOB_NUM; i++)
    bob_arr.push(new bob_t(0.0, 0.0));
  
  for (let i = 1; i < BOB_NUM / 2; i++) {
    const theta = i / (BOB_NUM / 2) * Math.PI;
    
    const sine = Math.sin(theta) * 0.4;
    const sine1 = Math.sin(3*theta) / 3 * 0.4;
    const sine2 = Math.sin(5*theta) / 5 * 0.4;
    const sine3 = Math.sin(7*theta) / 7 * 0.4;
    
    const cosine = Math.cos(theta) * 0.4;
    const cosine1 = Math.cos(3*theta)/3 * 0.4;
    const cosine2 = Math.cos(5*theta)/5 * 0.4;
    const cosine3 = Math.cos(7*theta)/7 * 0.4;
    
    const u = sine + sine1 + sine2 + sine3;
    const u_t = -(cosine + cosine1 + cosine2 + cosine3);
    
    bob_arr[i].u = u;
    bob_arr[i].u_t = u_t;
  }
  /*
  for (let i = 1; i < BOB_NUM / 2; i++) {
    bob_arr[i].u = 0.5;
    bob_arr[i].u_t = -0.4;
  }
  */
  
  // stop = true;
}

const TIMESTEP = 0.015;

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
  
  const c = c_range.value;
  
  if (!stop) {
    for (let i = 1; i < bob_arr.length - 1; i++) {
      const du_dx_1 = bob_arr[i + 1].u - bob_arr[i].u;
      const du_dx_2 = bob_arr[i].u - bob_arr[i - 1].u;
      
      const d2u_dx2 = du_dx_1 - du_dx_2;
      
      bob_arr[i].u_t += c * d2u_dx2 * TIMESTEP;
    }
    
    for (const bob of bob_arr)
      bob.u += bob.u_t * TIMESTEP;
  }
  
  for (let i = 0; i < bob_arr.length - 1; i++) {
    const bob_a = new vec2_t(i * BOB_SIZE - bob_centre, bob_arr[i].u);
    const bob_b = new vec2_t((i + 1) * BOB_SIZE - bob_centre, bob_arr[i + 1].u);
    
    pen.circle(bob_a, BOB_SIZE * 0.5);
    pen.line(bob_a, bob_b);
  }

  pen.stroke();
}, TIMESTEP * 1000);
