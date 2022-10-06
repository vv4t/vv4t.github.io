"use strict";

import { field_t } from "./field.js";
import { vec2_t } from "./math.js";
import { display_t } from "./display.js";
import { pen_t } from "../wire-3d/pen.js";

const TIMESTEP = 0.015;

function main()
{
  const WIDTH = 100;
  const HEIGHT = 100;
  
  const field = new field_t(WIDTH, HEIGHT);
  const display = new display_t(WIDTH, HEIGHT);
  
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  
  const pen = new pen_t(canvas);
  ctx.strokeStyle = "#ffffff";
  
  let mouse_down = false;
  let cell_x = 0;
  let cell_y = 0;
  
  canvas.addEventListener("mousedown", function(e) {
    mouse_down = true;
  });
  
  canvas.addEventListener("mouseup", function(e) {
    mouse_down = false;
  });
  
  canvas.addEventListener("mousemove", function(e) {
    cell_x = Math.floor(e.offsetX * WIDTH / canvas.width);
    cell_y = Math.floor(e.offsetY * HEIGHT / canvas.height);
  });
  
  let time = 0.0;
  let next_H = 0.0;
  
  setInterval(function() {
    const H_size = document.getElementById("H_size").value / 1000.0;
    const H_rate = document.getElementById("H_rate").value / 1000.0;
    
    const cell_e = document.getElementById("cell_e").value / 10.0;
    const cell_u = document.getElementById("cell_u").value / 10.0;
    const cell_o = document.getElementById("cell_o").value / 10.0;
    
    const brush_R = Math.floor(document.getElementById("R_size").value / 2.0);
    
    const brush = document.getElementById("brush").value;
    
    if (mouse_down) {
      switch (brush) {
      case "wall":
        field.cell_rect(cell_x, cell_y, brush_R, cell_e, cell_u, cell_o, true);
        break;
      case "eraser":
        field.clear_rect(cell_x, cell_y, brush_R);
        break;
      case "burst":
        if (time > next_H) {
          field.emit_H(cell_x, cell_y, brush_R, H_size);
          next_H = time + H_rate;
        }
        break;
      }
    }
    
    /*
    const theta = 4 * time;
    
    {
      const y_pos = 30 + Math.cos(theta) * 10;
      const d_y_pos = -Math.sin(theta) * 10;
      
      field.emit_move(50, Math.floor(y_pos), 0, -d_y_pos * TIMESTEP, 0.1);
    }
    {
      const y_pos = 30 - Math.cos(theta) * 10;
      const d_y_pos = +Math.sin(theta) * 10;
      
      field.emit_move(50, Math.floor(y_pos), 0, -d_y_pos * TIMESTEP, -0.1);
    }*/
    /*
    {
      const period = Math.cos(0.5 * time) * 5;
      for (let i = 0; i < 5; i++) {
        const theta = period * time + i * 2 * Math.PI / 5;
        
        const x_pos = 50 + Math.cos(theta) * 30;
        const y_pos = 50 + Math.sin(theta) * 30;
        
        const d_x_pos = Math.sin(theta) * period * 30 * TIMESTEP;
        const d_y_pos = -Math.cos(theta) * period * 30 * TIMESTEP;
        
        field.emit_move(Math.floor(x_pos), Math.floor(y_pos), d_x_pos, d_y_pos, 0.01);
      }
    }*/
    
    field.update(TIMESTEP);
    
    field.draw_H(display);
    display.swap();
    ctx.drawImage(display.canvas, 0, 0, 640, 640);
    
    // pen.clear();
    pen.begin();
    field.draw_E(pen);
    pen.stroke();
    
    
    time += TIMESTEP;
  }, TIMESTEP * 1000);
}

main();
