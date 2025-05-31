#include "../util/math.glsl"

layout (std140) uniform ubo {
  vec2 mouse;
};

out vec4 frag_color;

uniform samplerCube sky;

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(800.0, 600.0) * 2.0 - 1.0;
  vec3 view_dir = (rotate_y(mouse.x) * rotate_x(mouse.y) * vec4(uv, 1.0, 1.0)).xyz;
  frag_color = texture(sky, view_dir);
}
