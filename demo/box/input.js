"use strict";

import { draw } from "./draw.js";
import { vec2_t } from "./math.js";

const c = document.getElementById("canvas");

let input_mouse_button = false;
let input_mouse_x = 0;
let input_mouse_y = 0;

const input_keyboard = {};

function input_mousedown(e)
{
  input_mouse_button = true;
}

function input_mouseup(e)
{
  input_mouse_button = false;
}

function input_mousemove(e)
{
  input_mouse_x = +e.offsetX - c.width / 2;
  input_mouse_y = -e.offsetY + c.height / 2;
}

function input_keydown(e)
{
  input_keyboard[e.keyCode] = true;
}

function input_keyup(e)
{
  input_keyboard[e.keyCode] = false;
}

c.addEventListener("mouseup", input_mouseup);
c.addEventListener("mousedown", input_mousedown);
c.addEventListener("mousemove", input_mousemove);
document.addEventListener("keydown", input_keydown);
document.addEventListener("keyup", input_keyup);

export class input {
  static get_mouse_button()
  {
    return input_mouse_button;
  }
  
  static get_mouse_pos()
  {
    return vec2_t.mulf(new vec2_t(input_mouse_x, input_mouse_y), 1.0 / draw.SCALE);
  }
  
  static get_key(key)
  {
    return input_keyboard[key.charCodeAt(0)];
  }
}
