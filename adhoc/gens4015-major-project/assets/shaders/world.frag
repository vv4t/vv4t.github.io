#version 300 es

precision highp float;

in vec2 vs_uv;
out vec4 frag_color;

uniform sampler2D u_texture;

void main() {
  vec4 color = texture(u_texture, vs_uv);
  if (color.w == 0.0) discard;
  frag_color = color;
}
