"use strict";

import { rand, vec2_t, plane_t } from "./math.js";

function read_file(url, on_load)
{
  const req = new XMLHttpRequest();
  req.addEventListener("load", function() {
    on_load(this.responseText);
  });
  req.open("GET", url);
  req.send();
}

function make_plane(a, b)
{
  const d_pos = vec2_t.normalize(vec2_t.sub(a, b));
  const normal = vec2_t.cross_up(d_pos, -1);
  const dist = vec2_t.dot(normal, a);
  return new plane_t(normal, dist);
}

class segment_t {
  constructor(side_a, side_b, back) {
    this.side_a = side_a;
    this.side_b = side_b;
    this.back = back;
  }
};

function parse_plane(obj_plane)
{
  const normal = new vec2_t(obj_plane.normal.x, obj_plane.normal.y);
  const distance = obj_plane.distance;
  
  return new plane_t(normal, distance);
}

function parse_segment(obj_segment)
{
  const side_a = parse_plane(obj_segment.side_a);
  const side_b = parse_plane(obj_segment.side_b);
  const back = parse_plane(obj_segment.back);
  
  return new segment_t(side_a, side_b, back);
}

export class map_t {
  constructor(track_path)
  {
    this.segments = [];
    this.vertices = [];
    read_file(track_path, (body) => {
      const track = JSON.parse(body);
      
      for (const segment of track.segments)
        this.segments.push(parse_segment(segment));
      for (const vertex of track.vertices)
        this.vertices.push(new vec2_t(vertex.x, vertex.y));
    });
  }
  
  draw3d(draw3d)
  {
    for (let i = 0; i < this.vertices.length; i += 4) {
      draw3d.line(this.vertices[i], this.vertices[i + 1]);
      draw3d.line(this.vertices[i + 1], this.vertices[i + 2]);
      draw3d.line(this.vertices[i + 2], this.vertices[i + 3]);
      draw3d.line(this.vertices[i + 3], this.vertices[i]);
    }
  }
  
  check_point(segment_id, pos)
  {
    const segment = this.segments[segment_id];
    const front_plane = plane_t.flip(this.segments[(segment_id + 1) % this.segments.length].back);
    
    const clip_side_a = vec2_t.plane_project(pos, segment.side_a);
    const clip_side_b = vec2_t.plane_project(pos, segment.side_b);
    const clip_back = vec2_t.plane_project(pos, segment.back);
    const clip_front = vec2_t.plane_project(pos, front_plane);
    
    return clip_side_a > 0 && clip_side_b > 0 && clip_back > 0 && clip_front > 0;
  }
}

