out vec4 frag_color;

#include "../util/math.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  
  vec3 cube_pos;
  float view_pitch;
  
  float cube_vel;
};

void main() {
  vec2 p = vec2(5.0) + gl_FragCoord.xy / vec2(256.0, 256.0) * 5.0;
  float d = length(p - view_pos.xz);
  float a1 = d < 0.3 ? -cos(0.5 * M_PI * d / 0.3) * 0.04 : 0.0;
  
  float a2 = (
    p.x > cube_pos.x && p.x < cube_pos.x + 0.5 && 
    p.y > cube_pos.z && p.y < cube_pos.z + 0.5 &&
    cube_pos.y < -1.0
  ) ? cube_vel * 0.4 : 0.0;
  
  float a = a1 + a2;
  
  frag_color = vec4(vec3(-a), 1.0);
}
