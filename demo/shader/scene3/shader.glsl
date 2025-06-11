#define MAX_DISTANCE 128.0

#include "../util/math.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

out vec4 frag_color;

float f(vec2 p) {
  p *= 0.3;
  float t = (atan(p.y, p.x) + M_PI) / (2.0 * M_PI);
  float r = length(p);
  float z = floor(r + t) - t;
  float s = M_PI * 4.0;
  return floor(z * s) / s * 4.0;
}

float h_march(vec3 ro, vec3 rd) {
  float dt = 0.01;
  float lh = 0.0;
  float ly = 0.0;
  
  float td;
  for (td = dt; td < MAX_DISTANCE; td += dt) {
    vec3 p = ro + rd * td;
    float h = f(p.xz);
    if (p.y < h) {
      return td - dt + dt * (lh - ly) / (p.y - ly - h + lh);
    }
    
    dt = 0.01 * td;
    lh = h;
    ly = p.y;
  }
  
  return MAX_DISTANCE;
}

void main() {
  vec2 screen_pos = gl_FragCoord.xy / vec2(200.0, 150.0) * 2.0 - 1.0;
  screen_pos.x *= 200.0 / 150.0;
  
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  vec3 ro = view_pos;
  vec3 rd = normalize((view_mat * vec4(screen_pos, 1.0, 1.0)).xyz);
  
  float td = h_march(ro, rd);
  vec3 p = ro + rd * td;
  
  vec3 color;
  if (td < MAX_DISTANCE) {
    color = vec3(exp(-0.05 * td));
  } else {
    color = vec3(0.0);
  }
  
  frag_color = vec4(color, 1.0);
}
