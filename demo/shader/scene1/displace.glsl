out vec4 frag_color;

#include "../util/math.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

void main() {
  vec2 p = (view_pos.xz - vec2(5.0, 5.0)) / 5.0 * vec2(256, 256);
  float d = length(gl_FragCoord.xy - p);
  float a = d < 10.0 ? -cos(0.5 * M_PI * d / 10.0) * 0.07 : 0.0;
  frag_color = vec4(vec3(a), 1.0);
}
