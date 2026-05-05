const canvas = document.getElementById("display");
const info = document.getElementById("info");
const ctx = canvas.getContext("2d");

const width = canvas.width;
const height = canvas.height;

let hold = false;
let stop = false;

let points = [];


function bezier_fit() {
  // ctx.clearRect(0, 0, width, height);

  let other_points = points.slice();
  let curves = 0;

  ctx.fillStyle = "red";
  ctx.strokeStyle = "red";

  while (other_points.length > 2) {
    const dt_points = [];
    for (let i = 1; i < other_points.length; i++) {
      const delta = sub(other_points[i], other_points[i - 1]);
      dt_points.push(mulf(delta, other_points.length));
    }

    const chunk = best_fit(dt_points);

    const sample = dt_points.slice(0, chunk - 1).map((x) => mulf(x, chunk / other_points.length));
    const [t0, t1, r] = linear_regression(sample);
    
    const A = other_points[0];
    const C = other_points[chunk];
    const B = mulf(add(t0, mulf(A, 2)), 0.5);

    draw_bezier(A, B, C);

    other_points = other_points.slice(chunk);
    curves++;
  }

  info.innerHTML = `${points.length} points approximated with ${curves} quadratic bezier curves using ${curves * 2} points.<br>Compression: ${Math.round(curves * 2 / points.length * 100)}%.`;
}

function best_fit(sample) {
  let sx = 0.0;
  let sy = 0.0;
  let sxx = 0.0;
  let syy = 0.0;
  let sxy = 0.0;

  for (let i = 0; i < sample.length; i++) {
    const x = sample[i][0];
    const y = sample[i][1];

    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
 
    const m = i + 1;
    const cov = sxy / m - sx * sy / m / m;
    const sigmax = Math.sqrt(sxx / m -  sx * sx / m / m);
    const sigmay = Math.sqrt(syy / m -  sy * sy / m / m);
    const r = cov / sigmax / sigmay;
    
    const cos_angle = i > 1 ? dot(normalise(sample[i]), normalise(sample[i - 1])) : 1.0;

    if (Math.abs(r) < 0.95 || cos_angle < 0.8 || i >= 50)
      return i;
  }

  return sample.length;
}

function post_calculate() {
  const dt_points = [];
  for (let i = 1; i < points.length; i++) {
    const delta = sub(points[i], points[i - 1]);
    dt_points.push(mulf(delta, points.length));
  }

  const [p0, p1, r] = linear_regression(dt_points);

  ctx.beginPath();
  ctx.moveTo(...to_screen(p0));
  ctx.lineTo(...to_screen(p1));
  ctx.stroke();

  const A = points[0];
  const C = points[points.length - 1];
  const B = mulf(add(p0, mulf(A, 2)), 0.5);

  fill_point(A);
  fill_point(dt_points[0]);
  fill_point(p0);
  fill_point(B);
  draw_bezier(A, B, C);
}

function linear_regression(sample) {
  let sx = 0.0;
  let sy = 0.0;
  let sxx = 0.0;
  let syy = 0.0;
  let sxy = 0.0;

  const n = sample.length;

  if (n < 5)
    return [sample[0], sample[n - 1], 1.0];

  for (let i = 0; i < n; i++) {
    const x = sample[i][0];
    const y = sample[i][1];

    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }

  const cov = sxy / n - sx * sy / n / n;
  const sigmax = Math.sqrt(sxx / n -  sx * sx / n / n);
  const sigmay = Math.sqrt(syy / n -  sy * sy / n / n);
  const r = cov / sigmax / sigmay;

  const b1 = r * sigmay / sigmax;
  const b0 = (sy - sx * b1) / n;

  const x0 = sx / n - 2 * sigmax;
  const x1 = sx / n + 2 * sigmax;

  const p0 = [x0, b0 + x0 * b1];
  const p1 = [x1, b0 + x1 * b1];

  const diff_delta = sub(sample[sample.length - 1], sample[0]);
  const is_flip = (Math.abs(diff_delta[0]) > Math.abs(diff_delta[1]) ? diff_delta[0] : diff_delta[0]) > 0;

  const [t0, t1] = is_flip ? [p0, p1] : [p1, p0];

  return [t0, t1, r];
}

let frame = 0;

function update() {
  if (stop) return;
  
  ctx.clearRect(0, 0, width, height);

  fill_point([0, 0]);

  if (points.length > 0) {

    // ctx.beginPath();
    // ctx.moveTo(...to_screen(points[0]));
    fill_point(points[0]);
    for (let i = 1; i < points.length; i++) {
      // ctx.lineTo(...to_screen(points[i]));
      fill_point(points[i]);
    }
    // ctx.stroke();
  }

  if (points.length > 1 && false) {
    ctx.beginPath();
    const delta0 = sub(points[1], points[0]);
    ctx.moveTo(...to_screen(mulf(delta0, points.length)));
    // fill_point(mulf(delta0, T));
    for (let i = 2; i < points.length; i++) {
      const delta = sub(points[i], points[i - 1]);
      ctx.lineTo(...to_screen(mulf(delta, points.length)));
      // fill_point(mulf(delta, T));
    }

    ctx.stroke();
  }

  frame++;
  requestAnimationFrame(update);
}

function fill_point(a) {
  const S = 2;
  ctx.fillRect(...to_screen(sub(a, [S / 2, S / 2])), S, S);
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function mulf(a, b) {
  return [a[0] * b, a[1] * b];
}

function lerp(a, b, t) {
  return add(a, mulf(sub(b, a), t));
}

function to_screen(a, b) {
  return [a[0] + width / 2, a[1] + height / 2];
}

function length(a) {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1];
}

function normalise(a) {
  return mulf(a, 1.0 / length(a));
}

function draw_bezier(A, B, C) {
  const SEGMENTS = 16;

  ctx.beginPath();
  ctx.moveTo(...to_screen(bezier(A, B, C, 0)));
  for (let i = 1; i <= SEGMENTS; i++) {
    ctx.lineTo(...to_screen(bezier(A, B, C, i / SEGMENTS)));
  }
  ctx.stroke();
}

function bezier(a, b, c, t) {
  const A = mulf(add(mulf(a, 1 - t), mulf(b, t)), 1 - t);
  const B = mulf(add(mulf(b, 1 - t), mulf(c, t)), t);
  return add(A, B);
}

const SEGMENT_LENGTH = 10;
let prev_mouse = null;
let total_dist = 0.0;

canvas.addEventListener("mousemove", (e) => {
  if (stop) return;

  if (hold) {
    let now_mouse = [e.offsetX - width / 2, e.offsetY - height / 2];

    if (prev_mouse != null) {
      const delta = sub(now_mouse, prev_mouse);
      const dist = length(delta);

      let t_accum = Math.ceil(total_dist / SEGMENT_LENGTH) * SEGMENT_LENGTH;

      while (t_accum < total_dist + dist) {
        let t = (t_accum - total_dist) / dist;
        points.push(lerp(prev_mouse, now_mouse, t));
        t_accum += SEGMENT_LENGTH;
      }

      total_dist += dist;
    }

    prev_mouse = now_mouse;
  }
});
canvas.addEventListener("mousedown", (e) => hold = true);
canvas.addEventListener("mouseup", (e) => {
  hold = false;
  stop = true;
  // post_calculate();
  bezier_fit();
});

requestAnimationFrame(update);
