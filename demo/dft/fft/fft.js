#!/usr/bin/env node

function fstr(f)
{
  return (f >= 0.0 ? "+" : "") + f.toFixed(2);
}

class complex_t {
  constructor(x, y)
  {
    this.x = x;
    this.y = y;
  }
  
  mul(c)
  {
    return C(this.x * c.x - this.y * c.y, this.x * c.y + this.y * c.x);
  }
  
  pow(n)
  {
    let r = Math.sqrt(this.x * this.x + this.y * this.y);
    let theta = Math.atan2(this.y, this.x);
    return R(Math.pow(r, n)).mul(C(Math.cos(theta * n), Math.sin(theta * n)));
  }
  
  add(c)
  {
    return C(this.x + c.x, this.y + c.y);
  }
  
  sub(c)
  {
    return C(this.x - c.x, this.y - c.y);
  }
  
  repr()
  {
    return `(${fstr(this.x)}, ${fstr(this.y)})`;
  }
};

class matrix_t {
  constructor(col, row)
  {
    this.col = col;
    this.row = row;
    
    this.m = [];
    for (let i = 0; i < this.col * this.row; i++) {
      this.m.push(C(0.0, 0.0));
    }
  }
  
  set(i, j, k)
  {
    if (i < 0 || j < 0 || i >= this.col || j >= this.row) {
      console.error(`out of bounds: m[${i}][${j}] from ${this.col}x${this.row} matrix`);
      process.exit();
    }
    
    this.m[i + j * this.col] = k;
  }
  
  get(i, j)
  {
    return this.m[i + j * this.col];
  }
  
  identity()
  {
    for (let i = 0; i < this.row; i++) {
      for (let j = 0; j < this.col; j++) {
        if (i == j) {
          this.set(i, j, R(1));
        } else {
          this.set(i, j, R(0));
        }
      }
    }
    
    return this;
  }
  
  mul(m)
  {
    if (this.col != m.row) {
      console.error(`invalid multiplication: ${this.col}x${this.row} matrix with ${m.col}x${m.row} matrix`);
      process.exit();
    }
    
    let r = new matrix_t(m.col, this.row);
    
    for (let i = 0; i < this.row; i++) {
      for (let j = 0; j < m.col; j++) {
        let r_ji = C(0.0, 0.0);
        for (let k = 0; k < this.col; k++) {
          r_ji = r_ji.add(this.get(k, i).mul(m.get(j, k)));
        }
        r.set(j, i, r_ji);
      }
    }
    
    return r;
  }
  
  repr()
  {
    let text = "[\n";
    for (let i = 0; i < this.row; i++) {
      let line = "";
      
      if (i > 0) {
        line += "\n";
      }
      
      line += "  ";
      
      for (let j = 0; j < this.col; j++) {
        line += this.get(i, j).repr();
        
        if (j < this.col - 1) {
          line += " ";
        }
      }
      text += line;
    }
    text += "\n]";
    return text;
  }
};

function vector(v)
{
  let m = new matrix_t(1, v.length);
  
  for (let i = 0; i < v.length; i++) {
    m.set(0, i, v[i]);
  }
  
  return m;
}

function C(x, y)
{
  return new complex_t(x, y);
}

function R(n)
{
  return C(n, 0.0);
}

function nth_root(n)
{
  return C(Math.cos(Math.PI * 2.0 / n), Math.sin(Math.PI * 2.0 / n));
}

function vandermonde(N)
{
  let V = new matrix_t(N, N);
  let inv_V = new matrix_t(N, N);
  
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let u = i - Math.floor(N/2);
      let v = j - Math.floor(N/2);
      
      V.set(i, j, nth_root(N).pow(u*v));
      inv_V.set(i, j, nth_root(N).pow(-u*v).mul(R(1.0 / N)));
    }
  }
  
  return [ V, inv_V ];
}

function fft2(y, A, x, N, offset, step)
{
  if (offset + step >= N) {
    return [ [ "a" + offset, x ] ];
  }
  
  const a = fft(y, A, x * 2, N, offset, step * 2);
  const b = fft(y, A, x * 2, N, offset + step, step * 2).map((y) => [ y[0], y[1] + x ] );
  
  console.log(a.map((y) => [ y[0], y[1] % N]), b.map((y) => [ y[0], y[1] % N]));
  
  return [ ...a, ...b ];
}

function fft(A, N)
{
  if (N == 1) {
    return vector([ A.get(0, 0) ]);
  }
  
  const A_even = new matrix_t(1, N/2);
  const A_odd = new matrix_t(1, N/2);
  
  for (let i = 0; i < N / 2; i++) {
    A_even.set(0, i, A.get(0, i * 2));
    A_odd.set(0, i, A.get(0, i * 2 + 1));
  }
  
  const y_even = fft(A_even, N / 2);
  const y_odd = fft(A_odd, N / 2);
  
  const y = new matrix_t(1, N);
  const w = nth_root(N);
  let x = R(1.0);
  
  for (let i = 0; i < N / 2; i++) {
    y.set(0, i, y_even.get(0, i).add(y_odd.get(0, i).mul(x)));
    y.set(0, i + N/2, y_even.get(0, i).sub(y_odd.get(0, i).mul(x)));
    x = x.mul(w);
  }
  
  return y;
}

function ifft_R(A, N)
{
  if (N == 1) {
    return vector([ A.get(0, 0) ]);
  }
  
  const A_even = new matrix_t(1, N/2);
  const A_odd = new matrix_t(1, N/2);
  
  for (let i = 0; i < N / 2; i++) {
    A_even.set(0, i, A.get(0, i * 2));
    A_odd.set(0, i, A.get(0, i * 2 + 1));
  }
  
  const y_even = ifft_R(A_even, N / 2);
  const y_odd = ifft_R(A_odd, N / 2);
  
  const y = new matrix_t(1, N);
  const w = nth_root(-N);
  let x = R(1.0);
  
  for (let i = 0; i < N / 2; i++) {
    y.set(0, i, y_even.get(0, i).add(y_odd.get(0, i).mul(x)));
    y.set(0, i + N/2, y_even.get(0, i).sub(y_odd.get(0, i).mul(x)));
    x = x.mul(w);
  }
  
  return y;
}

function ifft(A, N)
{
  const c1 = fft(A, N);
  const c2 = ifft_R(A, N);
  
  const c = new matrix_t(1, N);
  
  c.set(0, 0, c1.get(0, N/2).mul(R(1.0 / N)));
  c.set(0, N/2, c1.get(0, 0).mul(R(1.0 / N)));
  
  for (let i = 1; i < N/2; i++) {
    let k = -((i % 2) * 2.0 - 1.0);
    
    if (i < 2) {
      k = k;
    }
    
    c.set(0, N/2 - i, c1.get(0, i).mul(R(k * 1.0 / N)));
    c.set(0, N/2 + i, c2.get(0, i).mul(R(k * 1.0 / N)));
  }
  
  return c;
}

function f(x)
{
  return C(Math.pow(x, 2.0), x);
}

function p(c, x)
{
  let y = R(0.0);
  
  for (let i = 0; i < c.row; i++) {
    y = y.add(c.get(0, i).mul(x.pow(i)));
  }
  
  return y;
}

function p2(c, t)
{
  let y = 0.0;
  
  for (let i = 0; i < c.row; i++) {
    y += c.get(0, i).x * Math.cos(t * i);
  }
  
  return y;
}

function sample(f, n, d)
{
  let a = [];
  
  for (let i = 0; i < n; i++) {
    a.push(f(i * d));
  }
  
  return vector(a);
}

const N = 32;

let y = sample(f, N, 1.0);

let c = ifft(y, N);
console.log(c.repr());
console.log(p(c, nth_root(N).pow(0)).repr());
console.log(p2(c, Math.PI * 2.0 / N * 5.0));

let [ V, inv_V ] = vandermonde(N);
const invV_y = inv_V.mul(y);
console.log(invV_y.repr());
console.log(p(invV_y, nth_root(N).pow(0)).repr());
console.log(p2(invV_y, Math.PI * 2.0 / N * 5.0));
