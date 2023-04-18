import { pen_t } from "./pen.js";
import { vec2_t, rand } from "./math.js";

const canvas = document.getElementById("display");
const pen = new pen_t(canvas);

class fixed_link_t {
  constructor(ball, pos, length)
  {
    this.ball = ball;
    this.pos = pos;
    this.length = length;
  }
};

class list_t {
  constructor(pos, node)
  {
    this.pos = pos;
    this.node = node;
  }
};

class ball_t {
  constructor(pos)
  {
    this.pos = pos;
    this.vel = new vec2_t(0,0);
    this.radius = 0.06;
    this.color = "rgb(" +
      Math.floor(50 + Math.random() * 106).toString() + ", " +
      Math.floor(50 + Math.random() * 106).toString() + ", " +
      Math.floor(50 + Math.random() * 106).toString() + ")";
    this.next = null;
    this.prev = null;
  }
};

const balls = [
  new ball_t(new vec2_t(0.2, 0.5), null)
];

const lists = [
  new list_t(new vec2_t(0, 0.5), balls[0])
];

function update()
{
  const dt = 0.015;
  
  apply_drag(dt);
  apply_gravity(dt);
  constrain_fixed_links(dt);
  constrain_links(dt);
  
  const h = 5;
  for (let i = 0; i < h; i++) {
    clip_balls(dt / h);
    clip_bounds(dt / h);
    integrate_motion(dt / h);
  }
  
  pen.clear();
  pen.begin();
  
  draw_balls();
  draw_lists();
  
  pen.stroke();
}

let link_start = null;
let list_start = null;
let mode = "new_link";
let list_pos = 1;

const btn_new_link = document.getElementById("new_link");
const btn_point_list = document.getElementById("point_list");
const btn_new_ball = document.getElementById("new_ball");
const btn_free_ball = document.getElementById("free_ball");

document.getElementById("new_list").onclick = function() {
  if (list_pos >= 9)
    return;
  
  list_pos++;
  const list_x = Math.floor(list_pos / 2) * (list_pos % 2 == 0 ? -1 : 1);
  
  lists.push(
    new list_t(
      new vec2_t(list_x * 0.3, 0.5), null
    )
  );
  
  display_lists();
};

document.getElementById("new_ball").onclick = function() {
  balls.push(
    new ball_t(
      new vec2_t(rand() * 0.5, 0.6 + rand() * 0.2)
    )
  );
  
};

btn_point_list.onclick = function() {
  btn_free_ball.classList.remove("active");
  btn_new_link.classList.remove("active");
  
  btn_point_list.classList.add("active");
  
  link_start = null;
  
  if (mode != "point_list")
    list_start = null;
  
  mode = "point_list";
};

btn_new_link.onclick = function() {
  btn_free_ball.classList.remove("active");
  btn_point_list.classList.remove("active");
  
  btn_new_link.classList.add("active");
  
  list_start = null;
  
  if (mode != "new_link")
    link_start = null;
  
  mode = "new_link";
};

btn_free_ball.onclick = function() {
  btn_new_link.classList.remove("active");
  btn_point_list.classList.remove("active");
  
  btn_free_ball.classList.add("active");
  
  link_start = null;
  list_start = null;
  
  mode = "free_ball";
};

canvas.onclick = function(e) {
  const click_pos = pen.world_space(new vec2_t(e.offsetX, e.offsetY));
  
  if (mode == "point_list") {
    for (const list of lists) {
      const delta_pos = list.pos.sub(click_pos);
      if (delta_pos.dot(delta_pos) > 0.04 * 0.04)
        continue;
      
      if (list_start == list)
        list_start = null;
      
      list_start = list;
    }
    
    for (const ball of balls) {
      const delta_pos = ball.pos.sub(click_pos);
      if (delta_pos.dot(delta_pos) > ball.radius * ball.radius)
        continue;
      
      list_start.node = ball;
      
      list_start = null;
    }
  }
  
  if (mode == "new_link") {
    for (const ball of balls) {
      const delta_pos = ball.pos.sub(click_pos);
      if (delta_pos.dot(delta_pos) > ball.radius * ball.radius)
        continue;
      
      if (!link_start) {
        link_start = ball;
      } else {
        if (ball == link_start) {
          link_start = null;
          break;
        }
        
        if (link_start.next)
          link_start.next.prev = null;
        link_start.next = ball;
        ball.prev = link_start;
        link_start = null;
      }
    }
  }
  
  if (mode == "free_ball") {
    for (let i = 0; i < balls.length; i++) {
      const delta_pos = balls[i].pos.sub(click_pos);
      if (delta_pos.dot(delta_pos) > balls[i].radius * balls[i].radius)
        continue;
      
      if (balls[i].prev)
        balls[i].prev.next = null;
      
      for (const list of lists) {
        if (list.node == balls[i])
          list.node = null;
      }
      
      balls.splice(i, 1);
    }
  }
  
  display_lists();
};

const lists_display = document.getElementById("lists");

function display_lists()
{
  lists_display.innerHTML = "";
  
  for (let i = 0; i < lists.length; i++) {
    let node = lists[i].node;
    
    lists_display.innerHTML += "list" + (i + 1) + ": ";
    
    if (node) {
      while (node.next != null) {
        lists_display.innerHTML += "<span style='color: " + node.color + ";'><b>[█]</b> </span> -> ";
        node = node.next;
      }
      
      lists_display.innerHTML += "<span style='color: " + node.color + ";'><b>[█]</b> </span>";
    }
    
    lists_display.innerHTML += "<br>";
  }
}

function draw_balls()
{
  for (const ball of balls) {
    if (ball == link_start)
      pen.circle(ball.pos, ball.radius / 2.0);
    
    pen.stroke();
    pen.begin();
    pen.color(ball.color);
    pen.circle(ball.pos, ball.radius);
    pen.circle(ball.pos, ball.radius * 0.9);
    pen.circle(ball.pos, ball.radius * 0.8);
    pen.stroke();
    pen.begin();
    pen.color("#000000");
    
    if (!ball.next)
      continue;
    
    const delta_pos = ball.next.pos.sub(ball.pos).normalize();
    const a_dir = delta_pos.cross_up(1.0).normalize().add(delta_pos.normalize().mulf(-1.3)).normalize().mulf(0.04);
    const b_dir = delta_pos.cross_up(-1.0).normalize().add(delta_pos.normalize().mulf(-1.3)).normalize().mulf(0.04);
    pen.line(ball.pos, ball.next.pos);
    pen.line(ball.next.pos, ball.next.pos.add(a_dir));
    pen.line(ball.next.pos, ball.next.pos.add(b_dir));
  }
}

function draw_lists()
{
  for (const list of lists) {
    pen.circle(list.pos, 0.02);
    
    if (list == list_start)
      pen.circle(list.pos, 0.03);
    
    if (!list.node)
      continue;
    
    const delta_pos = list.node.pos.sub(list.pos).normalize();
    const a_dir = delta_pos.cross_up(1.0).normalize().add(delta_pos.normalize().mulf(-1.3)).normalize().mulf(0.04);
    const b_dir = delta_pos.cross_up(-1.0).normalize().add(delta_pos.normalize().mulf(-1.3)).normalize().mulf(0.04);
    pen.line(list.node.pos, list.pos);
    pen.line(list.node.pos, list.node.pos.add(a_dir));
    pen.line(list.node.pos, list.node.pos.add(b_dir));
  }
}

function constrain_links(dt)
{
  for (const ball of balls) {
    if (!ball.next)
      continue;
    
    const delta_pos = ball.pos.sub(ball.next.pos);
    
    const jt_va = delta_pos;
    const jt_vb = delta_pos.mulf(-1);
    
    const v_a = ball.vel;
    const v_b = ball.next.vel;
    
    const b = 0.05 / dt * (delta_pos.length() - 0.2);
    const jv = jt_va.dot(v_a) + jt_vb.dot(v_b);
    const effective_mass = jt_va.dot(jt_va) + jt_vb.dot(jt_vb);
    const lambda = -(jv + b) / effective_mass;
    
    const dv_a = jt_va.mulf(lambda);
    const dv_b = jt_vb.mulf(lambda);
    
    ball.vel = ball.vel.add(dv_a);
    ball.next.vel = ball.next.vel.add(dv_b);
  }
}

function constrain_fixed_links(dt)
{
  for (const list of lists) {
    if (!list.node)
      continue;
    
    const delta_pos = list.node.pos.sub(list.pos);
    
    const jt_va = delta_pos;
    const v_a = list.node.vel;
    
    if (jt_va.dot(jt_va) < 0.02)
      continue;
    
    const b = 0.1 / dt * (delta_pos.length() - 0.2);
    const jv = jt_va.dot(v_a);
    const effective_mass = jt_va.dot(jt_va);
    const lambda = -(jv + b) / effective_mass;
    
    const dv_a = jt_va.mulf(lambda);
    
    list.node.vel = list.node.vel.add(dv_a);
  }
}

function apply_gravity(dt)
{
  for (const ball of balls) {
    ball.vel.y -= 4.0 * dt;
  }
}

function apply_drag(dt)
{
  for (const ball of balls) {
    ball.vel.x *= 0.99;
    ball.vel.y *= 0.99;
  }
}

function clip_balls(dt)
{
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const clip_vec = balls[j].pos.add(balls[j].vel.mulf(dt)).sub(balls[i].pos.add(balls[i].vel.mulf(dt)));
      const clip_dist = clip_vec.length();
      
      if (clip_dist > balls[i].radius + balls[j].radius)
        continue;
      
      const clip_normal = clip_vec.normalize();
      
      const jt_va = clip_normal;
      const jt_vb = clip_normal.mulf(-1);
      
      const v_a = balls[i].vel;
      const v_b = balls[j].vel;
      
      const b = 0.003 / dt * clip_dist;
      
      const jv = jt_va.dot(v_a) + jt_vb.dot(v_b);
      const effective_mass = jt_va.dot(jt_va) + jt_vb.dot(jt_vb);
      
      const lambda = -(jv + b) / effective_mass;
      
      if (lambda < 0) {
        const dv_a = jt_va.mulf(lambda);
        const dv_b = jt_vb.mulf(lambda);
        
        balls[i].vel = balls[i].vel.add(dv_a);
        balls[j].vel = balls[j].vel.add(dv_b);
      }
      
    }
  }
}

function clip_bounds(dt)
{
  for (const ball of balls) {
    if (ball.pos.y - ball.radius + ball.vel.y * dt < -1.0)
      ball.vel.y *= -0.5;
    
    if (ball.pos.y + ball.radius + ball.vel.y * dt > 1.0)
      ball.vel.y *= -0.5;
    
    if (ball.pos.x - ball.radius + ball.vel.x * dt < -1.0 / pen.aspect_ratio)
      ball.vel.x *= -0.5;
    
    if (ball.pos.x + ball.radius + ball.vel.x * dt > 1.0 / pen.aspect_ratio)
      ball.vel.x *= -0.5;
  }
}

function integrate_motion(dt)
{
  for (const ball of balls) {
    ball.pos = ball.pos.add(ball.vel.mulf(dt));
  }
}

display_lists();

setInterval(function() {
  update();
}, 0.015 * 1000);
