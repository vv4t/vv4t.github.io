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

function f(x)
{
  return R(Math.pow(x - 4.0, 3.0));
}

function p(c, x)
{
  let y = R(0.0);
  
  for (let i = 0; i < c.row; i++) {
    y = y.add(c.get(0, i).mul(x.pow(i - Math.floor(c.row / 2))));
  }
  
  return y;
}

function p2(c, t)
{
  let y = 0.0;
  
  for (let i = 0; i < c.row; i++) {
    y += c.get(0, i).x * Math.cos(t * (i - Math.floor(c.row / 2)));
  }
  
  return y;
}

function sample(f, n, d)
{
  let a = [];
  
  for (let i = -Math.floor(n / 2); i <= Math.floor(n/2); i++) {
    a.push(f(Math.abs(i) * d));
  }
  
  return vector(a);
}

const N = 17;

let [ V, inv_V ] = vandermonde(N);
let y = sample(f, N, 1.0);

let invV_y = inv_V.mul(y);

console.log(invV_y.repr());

clear();

for (let i = 0; i < 17; i++) {
  circle(i * 40, 300 - y.get(0, i).x, 10);
}

for (let i = 0; i < 17 * 4; i++) {
  line(
    i * 40 / 4, 300 - p2(invV_y, i / 4 * Math.PI * 2.0 / N - Math.PI),
    (i + 1) * 40 / 4, 300 - p2(invV_y, (i + 1) / 4 * Math.PI * 2.0 / N - Math.PI),
  );
}

stroke();
