"use strict";

import { clamp, vec2_t, plane_t } from "./math.js";

const TIMESTEP = 0.015;

export class car_t {
  pos;
  wheel_dir;
  dir;
  vel;
  force;
  ang_vel;
  is_brake;
  grip_loss;
  clipped_segment_id;
  
  constructor()
  {
    this.pos = new vec2_t();
    this.wheel_dir = 0.0;
    this.dir = vec2_t.rotate(new vec2_t(0, 1), 0.0);
    this.vel = new vec2_t(0, 0);
    this.force = new vec2_t();
    this.ang_vel = 0;
    this.is_brake = false;
    this.grip_loss = false;
    this.clipped_segment_id = -1;
  }
  
  reset_forces()
  {
    this.force = new vec2_t(0, 0);
  }
  
  accel(amount)
  {
    const f_accel = vec2_t.mulf(this.dir, amount);
    this.force = vec2_t.add(this.force, f_accel);
  }
  
  brake(is_brake)
  {
    this.is_brake = is_brake;
  }
  
  steer(w)
  {
    this.wheel_dir = w;
  }
  
  wheel_reset()
  {
    this.wheel_dir -= this.wheel_dir * 8 * TIMESTEP;
  }
  
  drag()
  {
    const C = 0.01;
    const v_len = vec2_t.length(this.vel);
    const f_drag = vec2_t.mulf(this.vel, -v_len * C);
    this.force = vec2_t.add(this.force, f_drag);
  }
  
  wheel_forces()
  {
    const C_lat = 0.7;
    const C_long = 0.01;
    
    const f_grip = 0.65;
    const r_grip = this.is_brake ? 0.65 / 2.0 : 0.65;
    
    const r_r = vec2_t.mulf(this.dir, -1);
    const r_vel = vec2_t.add(this.vel, vec2_t.cross_up(r_r, -this.ang_vel));
    const r_spd = vec2_t.length(r_vel);
    const r_normal = this.dir;
    const r_tangent = vec2_t.cross_up(r_normal, 1);
    const r_slip_angle = vec2_t.dot(r_tangent, vec2_t.normalize(r_vel));
    const r_alpha = clamp(r_slip_angle, -r_grip, r_grip) * r_spd;
    const r_beta = vec2_t.dot(r_normal, r_vel);
    const r_f_lateral = vec2_t.mulf(r_tangent, -C_lat * r_alpha);
    const r_f_longtitudinal = vec2_t.mulf(r_normal, -C_long * r_beta);
    
    const f_r = this.dir;
    const f_vel = vec2_t.add(this.vel, vec2_t.cross_up(f_r, -this.ang_vel));
    const f_spd = vec2_t.length(f_vel);
    const f_normal = vec2_t.rotate(this.dir, this.wheel_dir);
    const f_tangent = vec2_t.cross_up(f_normal, 1);
    const f_slip_angle = vec2_t.dot(f_tangent, vec2_t.normalize(f_vel));
    const f_alpha = clamp(f_slip_angle, -f_grip, f_grip) * f_spd;
    const f_beta = vec2_t.dot(f_normal, f_vel);
    const f_f_lateral = vec2_t.mulf(f_tangent, -C_lat * f_alpha);
    const f_f_longtitudinal = vec2_t.mulf(f_normal, -C_long * f_beta);
    
    const r_f_net = vec2_t.add(r_f_lateral, r_f_longtitudinal);
    const f_f_net = vec2_t.add(f_f_lateral, f_f_longtitudinal);
    
    const f_net = vec2_t.add(r_f_net, f_f_net);
    
    const I = 0.55;
    const r_I = I;
    const f_I = I;
    
    const ang_accel = r_I * vec2_t.cross(r_r, r_f_net) + f_I * vec2_t.cross(f_r, f_f_net);
    this.ang_vel += ang_accel * TIMESTEP;
    this.force = vec2_t.add(this.force, f_net);
    
    this.grip_loss = r_slip_angle;
  }
  
  draw3d(draw3d)
  {
    const p1 = vec2_t.sub(this.pos, this.dir);
    const p2 = vec2_t.add(this.pos, this.dir);
    
    const wheel = vec2_t.rotate(this.dir, this.wheel_dir);
    const p3 = vec2_t.sub(p2, vec2_t.mulf(wheel, 0.5));
    const p4 = vec2_t.add(p2, vec2_t.mulf(wheel, 0.5));
    
    for (let i = 0; i < 2; i++) {
      const side = vec2_t.cross_up(this.dir, i * -2 + 1);
      
      const side_p1 = vec2_t.add(p1, side);
      const side_p2 = vec2_t.add(p2, side);
      const side_p3 = vec2_t.add(p3, side);
      const side_p4 = vec2_t.add(p4, side);
      
      draw3d.line(p1, side_p1);
      draw3d.line(p2, side_p2);
      
      draw3d.line(side_p1, side_p2);
      draw3d.line(side_p3, side_p4);
      draw3d.circle(side_p2, 0.1);
    }
    
    if (Math.abs(this.grip_loss) > 0.4)
      draw3d.circle(p1, Math.abs(this.grip_loss));
  }
  
  integrate()
  {
    this.dir = vec2_t.rotate(this.dir, this.ang_vel * TIMESTEP);
    this.vel = vec2_t.add(this.vel, vec2_t.mulf(this.force, TIMESTEP));
    this.pos = vec2_t.add(this.pos, vec2_t.mulf(this.vel, TIMESTEP));
  }
  
  clip(map)
  {
    if (this.clipped_segment_id == -1) {
      for (let i = 0; i < map.segments.length - 1; i++) {
        if (map.check_point(i, this.pos))
          this.clipped_segment_id = i;
      }
    } else {
      const segs_behind = this.clipped_segment_id;
      const segs_ahead = map.segments.length - this.clipped_segment_id;
      
      const max_segs = Math.max(segs_behind, segs_ahead);
      
      const segment_id = this.clipped_segment_id
      
      this.clipped_segment_id = -1;
      for (let i = 0; i < max_segs; i++) {
        const behind_id = segment_id - i < 0 ? map.segments.length - i : segment_id - i;
        const ahead_id = (segment_id + i) % map.segments.length;
        
        if (map.check_point(behind_id, this.pos)) {
          this.clipped_segment_id = behind_id;
          break;
        }
        
        if (map.check_point(ahead_id, this.pos)) {
          this.clipped_segment_id = ahead_id;
          break;
        }
      }
    }
    
    document.getElementById("seg_id").innerHTML = this.clipped_segment_id;
    
    if (this.clipped_segment_id != -1) {
      const segment = map.segments[this.clipped_segment_id];
      
      const new_pos = vec2_t.add(this.pos, vec2_t.mulf(this.vel, TIMESTEP));
      
      const clip_side_a = vec2_t.plane_project(new_pos, segment.side_a) - 0.5;
      const clip_side_b = vec2_t.plane_project(new_pos, segment.side_b) - 0.5;
      
      if (clip_side_a < 0) {
        const fix = -(vec2_t.dot(this.vel, segment.side_a.normal) + 0.2 * clip_side_a / TIMESTEP);
        this.vel = vec2_t.add(this.vel, vec2_t.mulf(segment.side_a.normal, fix));
      }
      
      if (clip_side_b < 0) {
        const fix = -(vec2_t.dot(this.vel, segment.side_b.normal) + 0.2 * clip_side_b / TIMESTEP);
        this.vel = vec2_t.add(this.vel, vec2_t.mulf(segment.side_b.normal, fix));
      }
    }
  }
};
