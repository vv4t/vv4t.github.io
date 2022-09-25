"use strict";

import { vec2_t } from "./math.js";

class cell_t {
  E;
  H;
  mtl;
  
  constructor(E, H, e, u, o, solid)
  {
    this.E = E;
    this.H = H;
    this.e = e;
    this.u = u;
    this.o = o;
    this.solid = solid;
  }
};

const BOUND = 5;

const E_FREE_SPACE = 0.5;
const U_FREE_SPACE = 0.003;
const O_FREE_SPACE = 0.4;

export class field_t {
  width;
  height;
  cells;
  
  constructor(width, height)
  {
    this.width = width + 2 * BOUND;
    this.height = height + 2 * BOUND;
    
    this.cells = [];
    
    for (let y = 0; y < this.height; y++) {
      this.cells.push([]);
      
      for (let x = 0; x < this.width; x++) {
        if (x < BOUND || y < BOUND || x >= this.width - BOUND || y >= this.height - BOUND) {
          this.cells[y].push(
            new cell_t(
              new vec2_t(0.0, 0.0),
              0.0,
              E_FREE_SPACE,
              U_FREE_SPACE,
              O_FREE_SPACE * 10.0, true));
        } else {
          this.cells[y].push(
            new cell_t(
              new vec2_t(0.0, 0.0),
              0.0,
              E_FREE_SPACE,
              U_FREE_SPACE,
              O_FREE_SPACE, false));
        }
      }
    }
  }
  
  update(delta_time)
  {
    this.update_H(delta_time);
    this.update_E(delta_time);
  }
  
  emit_H(x, y, R, charge)
  {
    for (let yp = y - R; yp <= y + R; yp++) {
      for (let xp = x - R; xp <= x + R; xp++) {
        if (xp < 0 || yp < 0 || xp >= this.width || yp >= this.height)
          continue;
        
        this.get_cell(xp, yp).H += charge;
      }
    }
  }
  
  set_cell(x, y, e, u, o, solid)
  {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height)
      return;
    
    this.get_cell(x, y).e = e;
    this.get_cell(x, y).u = u;
    this.get_cell(x, y).o = o;
    this.get_cell(x, y).solid = solid;
  }
  
  update_H(delta_time)
  {
    for (let y = 0; y < this.height - 1; y++) {
      for (let x = 0; x < this.width - 1; x++) {
        const dEy_dx = this.cells[y][x].E.y - this.cells[y][x + 1].E.y;
        const dEx_dy = this.cells[y][x].E.x - this.cells[y + 1][x].E.x;
        
        const curl_E = dEy_dx - dEx_dy;
        
        const inverse_permeability = 1.0 / this.cells[y][x].u;
        
        this.cells[y][x].H -= inverse_permeability * curl_E * delta_time;
      }
    }
  }
  
  update_E(delta_time)
  {
    for (let y = 1; y < this.height; y++) {
      for (let x = 1; x < this.width; x++) {
        const dHz_dx = this.cells[y][x - 1].H - this.cells[y][x].H; 
        const dHz_dy = this.cells[y - 1][x].H - this.cells[y][x].H;
        
        const curl_H = new vec2_t(dHz_dy, -dHz_dx);
        const J = vec2_t.mulf(this.cells[y][x].E, this.cells[y][x].o);
        
        const dE = vec2_t.sub(curl_H, J);
        
        const inverse_permittivity = 1.0 / this.cells[y][x].e;
        
        this.cells[y][x].E = vec2_t.add(this.cells[y][x].E, vec2_t.mulf(dE, inverse_permittivity * delta_time));
      }
    }
  }
  
  get_cell(x, y)
  {
    return this.cells[y + BOUND][x + BOUND];
  }
  
  cell_rect(x, y, R, e, u, o, solid)
  {
    for (let yp = y - R; yp < y + R; yp++) {
      for (let xp = x - R; xp < x + R; xp++) {
        if (xp < 0 || yp < 0 || xp >= this.width || yp >= this.height)
          continue;
        
        this.get_cell(xp, yp).e = e * E_FREE_SPACE;
        this.get_cell(xp, yp).u = u * U_FREE_SPACE;
        this.get_cell(xp, yp).o = o * O_FREE_SPACE;
        this.get_cell(xp, yp).solid = solid;
      }
    }
  }
  
  clear_rect(x, y, R)
  {
    for (let yp = y - R; yp < y + R; yp++) {
      for (let xp = x - R; xp < x + R; xp++) {
        if (xp < 0 || yp < 0 || xp >= this.width || yp >= this.height)
          continue;
        
        this.get_cell(xp, yp).e = E_FREE_SPACE;
        this.get_cell(xp, yp).u = U_FREE_SPACE;
        this.get_cell(xp, yp).o = O_FREE_SPACE;
        this.get_cell(xp, yp).solid = false;
      }
    }
  }
  
  draw_H(display)
  {
    for (let y = 0; y < this.height - BOUND; y++) {
      for (let x = 0; x < this.width - BOUND; x++) {
        const H_value = Math.abs(this.get_cell(x, y).H) * 3;
        
        let r = 0;
        let g = 0;
        let b = 0;
        
        if (this.get_cell(x, y).solid || (x % 2 == 0 && y % 2 == 0)) {
          r += Math.max((this.get_cell(x, y).e / (50 * E_FREE_SPACE)) * 255, 0);
          g += Math.max((this.get_cell(x, y).u / (50 * U_FREE_SPACE)) * 255, 0);
          b += Math.max((this.get_cell(x, y).o / (50 * O_FREE_SPACE)) * 255, 0);
        }
        
        if (this.get_cell(x, y).H > 0) {
          const H_col = HSVtoRGB(0.3 + 0.1 / H_value, 0.2 / H_value, H_value);
          r += H_col[0];
          g += H_col[1];
          b += H_col[2];
        }
        
        r = Math.min(r, 255);
        g = Math.min(g, 255);
        b = Math.min(b, 255);
        
        display.put_pixel_rgb([r, g, b], x, y);
      }
    }
  }
  
  draw_E(pen)
  {
    const aspect_ratio = 2 / (this.width - 2 * BOUND);
    const grid_size = 2;
    
    for (let y = 0; y < this.height - 2 * BOUND; y += grid_size) {
      for (let x = 0; x < this.width - 2 * BOUND; x += grid_size) {
        const screen_pos = new vec2_t(x, this.height - 2 * BOUND - y).mulf(aspect_ratio).sub(new vec2_t(1, 1));
        const cell = this.get_cell(x, y);
        
        const E = cell.E.copy();
        E.y *= -1;
        const len_E = Math.min(E.length() * 100 * aspect_ratio, grid_size / 2 * aspect_ratio);
        const screen_E = E.normalize().mulf(len_E);
        
        pen.line(screen_pos, screen_pos.add(screen_E));
      }
    }
  }
  
  get_width()
  {
    return this.width - 2 * BOUND;
  }
  
  get_height()
  {
    return this.height - 2 * BOUND;
  }
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    
    h = Math.min(h, 1);
    s = Math.min(s, 1);
    v = Math.min(v, 1);
    
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    
    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}
