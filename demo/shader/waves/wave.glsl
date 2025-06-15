out vec4 wave;

uniform sampler2D displace;
uniform sampler2D state;

void main() {
  ivec2 uv = ivec2(gl_FragCoord.xy);
  
  float a = texelFetch(displace, uv, 0).x;
  vec2 p = texelFetch(state, uv, 0).xy;
  
  float u = p.r;
  float u_t = p.g;
  
  float du_dx_1 = u - texelFetch(state, ivec2(uv.x - 1, uv.y), 0).x;
  float du_dy_1 = u - texelFetch(state, ivec2(uv.x, uv.y - 1), 0).x;
  
  float du_dx_2 = texelFetch(state, ivec2(uv.x + 1, uv.y), 0).x - u;
  float du_dy_2 = texelFetch(state, ivec2(uv.x, uv.y + 1), 0).x - u;
  
  float d2u_dx2 = du_dx_2 - du_dx_1;
  float d2u_dy2 = du_dy_2 - du_dy_1;
  
  float d2u_dt2 = d2u_dx2 + d2u_dy2;
  
  float c = 0.3;
  float u_0 = u * 2.0 - u_t + c * d2u_dt2 + a;
  
  wave = vec4(u_0 * 0.999, u * 0.999, 0.0, 1.0);
}
