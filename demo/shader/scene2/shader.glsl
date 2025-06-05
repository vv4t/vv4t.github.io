#include "../util/math.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

out vec4 frag_color;
uniform samplerCube sky;

float F(float x, float y) {
  return cos(x * 0.5) * cos(y * 0.5);
}

float P(vec3 ro, vec3 rd, float t) {
  return F(ro.x + rd.x * t, ro.z + rd.z * t) - ro.y - rd.y * t;
}

float P_t(vec3 ro, vec3 rd, float t) {
  return (P(ro, rd, t + 0.01) - P(ro, rd, t - 0.01)) / 0.02;
}

float P_tt(vec3 ro, vec3 rd, float t) {
  return (P_t(ro, rd, t + 0.01) - P_t(ro, rd, t - 0.01)) / 0.02;
}

void main() {
  vec2 uv = gl_FragCoord.xy / 600.0 * 2.0 - 1.0;
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  
  vec3 ro = view_pos;
  vec3 rd = normalize((view_mat * vec4(uv, 1.0, 1.0)).xyz);
  
  float t = 3.0;
  for (int i = 0; i < 16; i++) {
    // t = t - P(ro, rd, t) / dP_dt(ro, rd, t) * 0.3;
    t = t - 2.0 * P(ro, rd, t) * P_t(ro, rd, t) / (2.0 * pow(P_t(ro, rd, t), 2.0) - P(ro, rd, t) * P_tt(ro, rd, t));
  }
  
  vec3 color = texture(sky, rd).xyz;
  if (t > 0.0) {
    color = vec3(1.0 / t);
  }
  
  frag_color = vec4(color, 1.0);
}
