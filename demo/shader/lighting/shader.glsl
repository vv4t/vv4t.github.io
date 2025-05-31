#include "../util/math.glsl"
#include "../march/march.glsl"
#include "point_light.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

out vec4 frag_color;

float sdf_repeat(vec3 p);

void main() {
  vec2 uv = (gl_FragCoord.xy / 600.0 * 2.0 - 1.0);
  
  vec3 view_pos = view_pos;
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  vec3 rd = normalize((view_mat * vec4(uv, 1.0, 1.0)).xyz);
  
  trace_t tr = ray_march(view_pos, rd);
  vec3 p = view_pos + rd * tr.d;
  vec3 N = sdf_normal(p);
  
  vec3 color = vec3(0.0);
  
  if (tr.id == 1) {
    color = calc_point_lighting(p, -rd, N, vec3(1.0), 0.1, 0.4) + calc_point_scatter(p, view_pos);
  }
  
  frag_color = vec4(color, 1.0);
}

trace_t sdf(vec3 p) {
  trace_t tr = trace(0, MAX_DISTANCE);
  
  tr = tr_add(tr, trace(1, sdf_plane(p, vec3(0.0, 0.0, -1.0), -9.0)));
  tr = tr_add(tr, trace(1, sdf_plane(p, vec3(0.0, 0.0, +1.0), -9.0)));
  tr = tr_add(tr, trace(1, sdf_plane(p, vec3(-1.0, 0.0, 0.0), -4.0)));
  tr = tr_add(tr, trace(1, sdf_plane(p, vec3(+1.0, 0.0, 0.0), -4.0)));
  tr = tr_add(tr, trace(1, sdf_plane(p, vec3(0.0, -1.0, 0.0), -4.0)));
  tr = tr_add(tr, trace(1, sdf_plane(p, vec3(0.0, +1.0, 0.0), -4.0)));
  
  tr = tr_add(tr, trace(1, sdf_repeat(p)));
  
  return tr;
}

float sdf_repeat(vec3 p) {
  vec3 s = vec3(3.0);
  
  vec3 id = round(p/s);
  vec3 o = sign(p - s*id);
  
  float d = 1e20;
  for (int i = 0; i < 2; i++) {
    for (int j = 0; j < 2; j++) {
      for (int k = 0; k < 2; k++) {
        vec3 rid = id + vec3(i, j, k) * o;
        vec3 r = p - s*rid;
        d = min(d, sdf_cuboid(r, vec3(-1.0), vec3(1.0)));
      }
    }
  }
  
  return d;
}

light_t lights[] = light_t[](
  light_t(vec3(0.0, 0.0, 0.0), vec3(0.5, 1.0, 1.0) * 10.0)
);

light_t lights_get(int num) {
  return lights[num];
}

int lights_count() {
  return 1;
}
