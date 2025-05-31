#define MAX_DISTANCE 20.0

#include "../util/math.glsl"
#include "../march/march.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

out vec4 frag_color;
uniform samplerCube sky;
uniform sampler2D water;

vec3 get_water_normal(vec3 p);
vec3 render_mesh(vec3 ro, vec3 rd, trace_t tr);
vec3 render_water(vec3 ro, vec3 rd, trace_t tr);
trace_t water_plane(vec3 p, vec3 rd);

void main() {
  vec2 uv = (gl_FragCoord.xy / 600.0 * 2.0 - 1.0);
  
  vec3 view_pos = view_pos;
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  vec3 rd = normalize((view_mat * vec4(uv, 1.0, 1.0)).xyz);
  
  trace_t tr;
  tr = ray_march(view_pos, rd);
  tr = tr_add(tr, water_plane(view_pos, rd));
  
  vec3 color;
  if (tr.id == 2) {
    color = render_water(view_pos, rd, tr);
  } else {
    color = render_mesh(view_pos, rd, tr);
  }
  
  frag_color = vec4(color, 1.0);
}

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 get_albedo(vec3 p, vec3 N) {
  vec3 absN = abs(N);
  
  vec2 uv;
  if (absN.z > absN.y) {
    if (absN.z > absN.x) uv = p.xy;
    else uv = p.yz;
  } else {
    if (absN.y > absN.x) uv = p.xz;
    else uv = p.yz;
  }
  
  uv *= 4.0;
  
  float alpha = 0.0;
  
  if (fract(uv.y) > 0.5) {
    alpha = (fract(uv.x) > 0.5 ? 1.0 : 0.95);
  } else {
    alpha = (fract(uv.x) < 0.5 ? 1.0 : 0.95);
  }
  
  return vec3(alpha);
}

vec3 render_mesh(vec3 ro, vec3 rd, trace_t tr) {
  vec3 p = ro + rd * tr.d;
  vec3 N = sdf_normal(p);
  
  vec3 color = texture(sky, rd).xyz;
  
  if (tr.id == 1) {
    vec3 L = normalize(vec3(0.1, 1.0, -1.0));
    float NdotL = max(0.0, dot(N, L));
    color = get_albedo(p, N) * (NdotL * shadow(p, L, 1000.0) * 0.9 + 0.1) * 0.9 + 0.1;
  }
  
  return color;
}

vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}  

vec3 render_water(vec3 ro, vec3 rd, trace_t tr) {
  vec3 p = ro + rd * tr.d;
  vec3 N = get_water_normal(p);
  
  vec3 albedo = vec3(0.6, 0.9, 1.0);
  
  float metallic = 0.1;
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metallic);
  
  vec3 kS = fresnelSchlick(max(dot(N, -rd), 0.0), F0);
  vec3 kD = vec3(1.0) - kS;
  kD *= 1.0 - metallic;
  
  vec3 color = vec3(0.0);
  {
    vec3 R = reflect(rd, N);
    vec3 q = p + R * 0.05;
    tr = ray_march(q, R);
    color += render_mesh(q, R, tr) * kS;
  }
  
  {
    vec3 R = refract(rd, N, 1.0/1.33);
    vec3 q = p + R * 0.05;
    tr = ray_march(q, R);
    color += render_mesh(q, R, tr) * kD * albedo;
  }
  
  vec3 L = normalize(vec3(0.1, 1.0, -1.0));
  
  return color * (shadow(p, L, 1000.0) * 0.9 + 0.1) * 0.9 + 0.1;
}

vec3 get_water_normal(vec3 p) {
  ivec2 water_uv = ivec2((p.xz - vec2(5.0, 5.0)) / 5.0 * vec2(256.0, 256.0));
  vec2 u = texelFetch(water, water_uv, 0).xy;
  float du_dx = u.r - texelFetch(water, ivec2(water_uv.x - 1, water_uv.y), 0).x;
  float du_dy = u.r - texelFetch(water, ivec2(water_uv.x, water_uv.y - 1), 0).x;
  return normalize(vec3(-du_dx, 1.0, -du_dy));
}

trace_t water_plane(vec3 ro, vec3 rd) {
  vec3 n = normalize(vec3(0.0, 1.0, 0.0));
  float d = -1.2;
  float td = dot(n * d - ro, n) / dot(rd, n);
  vec3 p = ro + rd * td;
  
  trace_t tr = trace(0, MAX_DISTANCE);
  
  if (
    td > 0.0 &&
    p.x > 4.0 &&
    p.z > 4.0 &&
    p.x < 11.0 &&
    p.z < 11.0
  ) tr = trace(2, td);
  
  return tr;
}

trace_t sdf(vec3 p) {
  trace_t tr = trace(0, MAX_DISTANCE);
  
  float s1 = sdf_sub(
    sdf_cuboid(p, vec3(0.0, -10.0, 0.0), vec3(15.0, 9.0, 15.0)),
    sdf_cuboid(p, vec3(5.0, -2.5, 5.0), vec3(5.0, 3.0, 5.0))
  );
  
  vec3 sz = vec3(1.0, 7.0, 1.0);
  float s2 = (
    sdf_union(sdf_cuboid(p, vec3(2.0, -1.0, 2.0), sz),
    sdf_union(sdf_cuboid(p, vec3(12.0, -1.0, 2.0), sz),
    sdf_union(sdf_cuboid(p, vec3(2.0, -1.0, 12.0), sz),
    sdf_cuboid(p, vec3(11.0, -1.0, 11.0), sz)
  ))));
  
  tr = tr_add(tr, trace(1, sdf_union(s1, s2)));
  
  return tr;
}
