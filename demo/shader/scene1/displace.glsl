out vec4 frag_color;

#include "../util/math.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

void main() {
  vec2 p = vec2(-5.0) + gl_FragCoord.xy / vec2(256.0, 256.0) * 10.0;
  float d = length(p - view_pos.xz);
  float a = d < 0.3 ? -cos(0.5 * M_PI * d / 0.3) * 0.1 : 0.0;
  
  frag_color = vec4(vec3(a), 1.0);
}
