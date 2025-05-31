out vec4 frag_color;

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(800.0, 600.0);
  frag_color = vec4(uv, 1.0, 1.0);
}
