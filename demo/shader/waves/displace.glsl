out vec4 frag_color;

layout (std140) uniform ubo {
  vec2 mouse;
  float add;
};

void main() {
  float a = length(gl_FragCoord.xy - mouse) < 10.0 ? 0.01 : 0.0;
  frag_color = vec4(vec3(a), 1.0);
}
