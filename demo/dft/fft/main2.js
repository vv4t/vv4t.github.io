
const ctx = document.getElementById("display").getContext("2d");

function clear()
{
  ctx.clearRect(0, 0, 800, 600);
  ctx.beginPath();
}

function line(a, b, c, d)
{
  ctx.moveTo(a, b);
  ctx.lineTo(c, d);
}

function circle(x, y, r)
{
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function stroke()
{
  ctx.closePath();
  ctx.stroke();
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
};

function vandermonde(N)
{
  let inv_V = new matrix_t(N, N);
  
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let u = i - Math.floor(N/2);
      let v = j - Math.floor(N/2);
      
      inv_V.set(i, j, nth_root(N).pow(-u*v).mul(R(1.0 / N)));
    }
  }
  
  return inv_V;
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

function f(x)
{
  return R(Math.pow(x - 5.0, 3.0));
}

function p(c, x)
{
  let y = R(0.0);
  
  for (let i = 0; i < c.row; i++) {
    y = y.add(c.get(0, i).mul(x.pow(i)));
  }
  
  return y;
}

let mouse_x = 0;
let mouse_y = 0;
let mouse_down = false;

document.addEventListener("mousedown", () => mouse_down = true);
document.addEventListener("mouseup", () => mouse_down = false);
document.addEventListener("mousemove", (e) => {
  mouse_x = e.offsetX;
  mouse_y = e.offsetY;
});

const points = [];

const fn = setInterval(() => {
  if (mouse_down) {
    points.push(C(mouse_x - 300, mouse_y - 300));
    draw_points();
  } else if (points.length > 0) {
    const last = points[points.length - 1];
    const pot = 2**(points.length.toString(2).length);
    
    for (let i = points.length; i < pot; i++) {
      points.push(C(last.x, last.y));
    }
    
    clearInterval(fn);
    run();
  }
}, 25);

function draw_points()
{
  clear();
  let y1 = points[0];
  for (let i = 1; i < points.length; i++) {
    const y2 = points[i];
    circle(p.x + 300, p.y + 300, 2);
    line(y1.x + 300, y1.y + 300, y2.x + 300, y2.y + 300);
    y1 = y2;
  }
  stroke();
}

function run()
{
  const N = points.length;
  let y = vector(points);
  
  // let inv_V = vandermonde(N);
  // let c = inv_V.mul(y);
  let c = ifft(y, N);
  let k = Array.from(Array(N).keys());
  
  k.sort((x, y) => {
    const a = c.get(0, x);
    const b = c.get(0, y);
    
    return (b.x * b.x + b.y * b.y) - (a.x * a.x + a.y * a.y);
  });
  
  let t = 0.0;
  
  setInterval(() => {
    clear();
    draw_points();
    
    const x = nth_root(N).pow(t);
    
    let y1 = C(0.0, 0.0);
    
    for (let i = 0; i < k.length; i++) {
      const y2 = y1.add(c.get(0, k[i]).mul(x.pow(k[i] - Math.floor(c.row / 2))));
      line(y1.x + 300, y1.y + 300, y2.x + 300, y2.y + 300);
      y1 = y2;
    }
    
    t += N / 128.0;
    
    stroke();
  }, 25);
}

