out vec4 frag_color;

uniform sampler2D image;

float gamma = 1.5;
float exposure = 3.0;

void main() {
  vec2 uv = gl_FragCoord.xy / vec2(800.0, 600.0);
  vec3 color = texture(image, uv).rgb;
  color = vec3(1.0) - exp(-color * exposure);
  color = pow(color, vec3(1.0 / gamma));
  frag_color = vec4(color, 1.0);
}

