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

const TIMESTEP = 0.015;

function assert(cond)
{
  if (!cond)
    console.error("assertion failed");
}

class matrix_t {
  constructor(row, col)
  {
    this.row = row;
    this.col = col;
    this.m = new Float64Array(row * col);
  }
  
  get(i, j)
  {
    assert(i < this.row);
    assert(j < this.col);
    
    return this.m[i * this.col + j];
  }
  
  set(i, j, k)
  {
    assert(i < this.row);
    assert(j < this.col);
    
    this.m[i * this.col + j] = k;
  }
  
  mul(M)
  {
    assert(this.col == M.row);
    
    const res = new matrix_t(this.row, M.col);
    
    for (let i = 0; i < res.row; i++) {
      for (let j = 0; j < res.col; j++) {
        let m_ij = 0;
        
        for (let k = 0; k < this.col; k++) {
          m_ij += this.get(i, k) * M.get(k, j);
        }
        
        res.set(i, j, m_ij);
      }
    }
    
    return res;
  }
  
  mulf(f)
  {
    const res = new matrix_t(this.row, this.col);
    
    for (let i = 0; i < res.row; i++) {
      for (let j = 0; j < res.col; j++) {
        res.set(i, j, this.get(i,j) * f);
      }
    }
    
    return res;
  }
  
  add(M)
  {
    assert(this.row === M.row && this.col === M.col);
    
    const res = new matrix_t(this.row, this.col);
    
    for (let i = 0; i < this.row; i++) {
      for (let j = 0; j < this.col; j++) {
        res.set(i, j, this.get(i,j) + M.get(i,j));
      }
    }
    
    return res;
  }
  
  transpose()
  {
    const res = new matrix_t(this.col, this.row);
    
    for (let i = 0; i < this.col; i++) {
      for (let j = 0; j < this.row; j++) {
        res.set(i, j, this.get(j,i));
      }
    }
    
    return res;
  }
  
  copy()
  {
    const M = new matrix_t(this.row, this.col);
    M.m = this.m.slice();
    return M;
  }
  
  inverse()
  {
    assert(this.row === this.col);
    
    const order = this.row;
    
    const aug = new matrix_t(order, 2*order);
    
    for (let i = 0; i < order; i++) {
      for (let j = 0; j < order; j++) {
        if (i == j) {
          aug.set(i,order+j,1);
        } else {
          aug.set(i,order+j,0);
        }
        
        aug.set(i,j, this.get(i,j));
      }
    }
    
    for (let i = this.row - 1; i >= 0; i--) {
      if (aug.get(i-1,0) < aug.get(i,0)) {
        aug.swap(i-1, i);
      }
    }
    
    for (let i = 0; i < order; i++) {
      for (let j = 0; j < order; j++) {
        if (j != i) {
          const tmp = aug.get(j,i) / aug.get(i,i);
          for (let k = 0; k < 2 * order; k++) {
            aug.set(j,k, aug.get(j,k) - aug.get(i,k) * tmp);
          }
        }
      }
    }
    
    for (let i = 0; i < order; i++) {
      const tmp = aug.get(i,i);
      for (let j = 0; j < 2 * order; j++) {
        aug.set(i,j, aug.get(i,j) / tmp);
      }
    }
    
    const M_inv = new matrix_t(order, order);
    
    for (let i = 0; i < order; i++) {
      for (let j = 0; j < order; j++) {
        M_inv.set(i,j, aug.get(i,j+order));
      }
    }
    
    return M_inv;
  }
  
  swap(i,j)
  {
    for (let k = 0; k < this.col; k++) {
      const tmp = this.get(i,k);
      this.set(i,k, this.get(j,k));
      this.set(j,k, tmp);
    }
  }
  
  print()
  {
    let string = `matrix<${this.row}, ${this.col}> {\n`;
    
    for (let i = 0; i < this.row; i++) {
      for (let j = 0; j < this.col; j++) {
        string += " " + this.get(i,j).toFixed(3);
      }
      string += "\n";
    }
    string += "}";
    
    console.log(string);
  }
};

function matrix_from(arr)
{
  const res = new matrix_t(arr.length, arr[0].length);
  
  for (let i = 0; i < res.row; i++) {
    for (let j = 0; j < res.col; j++) {
      res.set(i, j, arr[i][j]);
    }
  }
  
  return res;
}

let T = new vec2_t(0.1, 0.1);

const B_n = 30;
const B = Array.from({length: B_n}, () => Math.random());
const dB = Array.from({length: B_n}, () => Math.random());

const R = 0.05;

const spots = [];

function update()
{
  T = input.get_mouse_pos();
  
  if (input.get_mouse_down(0)) {
    spots.push(input.get_mouse_pos().copy());
  }
  
  const C = [ C_4, C_5 ];
  
  const O = matrix_from([B]).transpose();
  const dO = matrix_from([dB]).transpose();
  
  const J = J_calc(C, O);
  const Jt = J.transpose();
  const Jv = J.mul(dO);
  const J_Jt = J.mul(Jt);
  
  const bias = matrix_from(C.map((C_i) => [60 * C_i(O)]));
  const lambda = J_Jt.inverse().mul(Jv.add(bias).mulf(-1));
  
  const F = Jt.mul(lambda);
    
  for (let i = 0; i < B.length; i++) {
    dB[i] += F.get(i,0);
    dB[i] *= 0.9;
    B[i] += dB[i] * 0.015;
  }
  
  pen.clear();
  pen.begin();
  
  let p = new vec2_t();
  for (let i = 0; i < B.length; i++) {
    const t_n = new vec2_t(0, R).rotate(B[i]);
    pen.circle(p, 0.01);
    pen.line(p, p.add(t_n));
    p = p.add(t_n);
  }
  
  for (let i = 1; i < spots.length; i++) {
    pen.line(spots[i-1], spots[i]);
  }
  
  
  pen.stroke();
}

function C_4(O)
{
  let p = new vec2_t();
  
  for (let i = 0; i < O.row; i++) {
    const t_n = new vec2_t(0, R).rotate(O.get(i,0));
    p = p.add(t_n);
  }
  
  const d = p.sub(T);
  
  return d.x;
}

function C_5(O)
{
  let p = new vec2_t();
  for (let i = 0; i < O.row; i++) {
    const t_n = new vec2_t(0, R).rotate(O.get(i,0));
    p = p.add(t_n);
  }
  
  const d = p.sub(T);
  
  return d.y;
}

function C_1(p)
{
  const pos = new vec2_t(p.get(0,0), p.get(1,0));
  const pos2 = new vec2_t(p.get(2,0), p.get(3,0));
  
  const delta = pos2.sub(pos);
  
  return delta.length() - 0.5;
}

function C_2(p)
{
  const pos = new vec2_t(p.get(0,0), p.get(1,0));
  const delta = pos.sub(T);
  
  return delta.length() - 0.5;
}

function C_3(p)
{
  const pos = new vec2_t(p.get(0,0), p.get(1,0));
  const delta = pos.sub(T);
  
  return delta.y;
}

function J_calc(C, p)
{
  const h = 0.001;
  
  const J = new matrix_t(C.length, p.row);
  
  for (let i = 0; i < C.length; i++) {
    const C_p = C[i](p);
    
    for (let j = 0; j < p.row; j++) {
      const p_j = p.copy();
      p_j.set(j, 0, p_j.get(j,0) + h);
      
      const dC_dp_j = (C[i](p_j) - C_p) / h;
      
      J.set(i, j, dC_dp_j);
    }
  }
  
  return J;
}
update();

setInterval(function() {
  update();
}, 16);
