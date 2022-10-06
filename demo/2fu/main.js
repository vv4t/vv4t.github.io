"use strict";

import { pen_t } from "../wire-3d/pen.js";
import { pen3d_t } from "../wire-3d/pen3d.js";
import { input_t, key } from "../wire-3d/input.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";
import { camera_t } from "../wire-3d/camera.js";

const canvas = document.getElementById("canvas");
const camera = new camera_t(new vec3_t(), new vec3_t());
const pen = new pen_t(canvas);
const pen3d = new pen3d_t(pen, camera, 1.3 * canvas.height / canvas.width);
const input = new input_t(canvas);

(function() {
  function start(model)
  {
  }

  function update()
  {
    pen.stroke();
    
    pen.begin();
    pen.color("green");
    pen.line(new vec2_t(0, -0.01), new vec2_t(0, 0.01));
    pen.line(new vec2_t(-0.01, 0), new vec2_t(0.01, 0));
    pen.stroke();
  }
})();
