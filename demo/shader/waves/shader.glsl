out vec4 frag_color;

uniform sampler2D image;

void main() {
  ivec2 uv = ivec2(gl_FragCoord.xy);
  
  vec2 p = texelFetch(image, uv, 0).xy;
  vec3 color = mix(vec3(1.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0), p.x * 0.5 + 0.5);
  
  frag_color = vec4(color, 1.0);
}
