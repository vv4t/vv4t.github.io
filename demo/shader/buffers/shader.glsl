layout (std140) uniform ubo {
  float time;
};

out vec4 frag_color;

uniform sampler2D image;

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(800.0, 600.0);
  frag_color = texture(image, uv) * time;
}
