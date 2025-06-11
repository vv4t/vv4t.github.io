#define MAX_DISTANCE 20.0

#include "../util/math.glsl"
#include "../util/march.glsl"

#define MESH (1 << 0)
#define WATER (1 << 1)
#define AMBIENCE 0.2

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  
  vec3 cube_pos;
  float view_pitch;
};

out vec4 frag_color;
uniform samplerCube sky;
uniform sampler2D water;

vec3 get_mesh_albedo(vec3 p, vec3 N, int id);
vec3 get_water_normal(vec3 p);
vec3 render_mesh(vec3 ro, vec3 rd, float td, int id);
vec3 render_water(vec3 ro, vec3 rd, float td);
int sdf_id(vec3 p, int mask);

void main() {
  vec2 uv = (gl_FragCoord.xy / 600.0 * 2.0 - 1.0);
  
  vec3 view_pos = view_pos;
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  vec3 rd = normalize((view_mat * vec4(uv, 1.0, 1.0)).xyz);

  float td = ray_march(view_pos, rd, MESH | WATER);
  vec3 p = view_pos + rd * td;
  int id = sdf_id(p, MESH | WATER);

  vec3 color;
  if (id == 2) {
    color = render_water(view_pos, rd, td);
  } else {
    color = render_mesh(view_pos, rd, td, id);
  }
  
  frag_color = vec4(color, 1.0);
}

float sdf(vec3 p, int mask) {
  float d = MAX_DISTANCE;
  
  if ((mask & MESH) > 0) {
    d = min(d, sdf_sub(
      sdf_cuboid(p, vec3(0.0, -10.0, 0.0), vec3(15.0, 9.0, 15.0)),
      sdf_cuboid(p, vec3(5.0, -1.5, 5.0), vec3(5.0, 3.0, 5.0))
    ));
    
    vec3 S = vec3(1.0, 7.0, 1.0);
    d = min(d, (
      sdf_union(sdf_cuboid(p, vec3(2.0, -1.0, 2.0), S),
      sdf_union(sdf_cuboid(p, vec3(12.0, -1.0, 2.0), S),
      sdf_union(sdf_cuboid(p, vec3(2.0, -1.0, 12.0), S),
      sdf_cuboid(p, vec3(11.0, -1.0, 11.0), S)
    )))));
    
    d = min(d, sdf_cuboid(p, cube_pos, vec3(0.5, 1.5, 0.5)));
  }
  
  if ((mask & WATER) > 0) {
    d = min(d, sdf_cuboid(p, vec3(5.0, -2.05, 5.0), vec3(5.0, 1.0, 5.0)));
  }
  
  return d;
}

int sdf_id(vec3 p, int mask) {
  float s1 = sdf_sub(
    sdf_cuboid(p, vec3(0.0, -10.0, 0.0), vec3(15.0, 9.0, 15.0)),
    sdf_cuboid(p, vec3(5.0, -1.5, 5.0), vec3(5.0, 3.0, 5.0))
  );
  
  vec3 S = vec3(1.0, 7.0, 1.0);
  float s2 = (
    sdf_union(sdf_cuboid(p, vec3(2.0, -1.0, 2.0), S),
    sdf_union(sdf_cuboid(p, vec3(12.0, -1.0, 2.0), S),
    sdf_union(sdf_cuboid(p, vec3(2.0, -1.0, 12.0), S),
    sdf_cuboid(p, vec3(11.0, -1.0, 11.0), S)
  ))));
  
  float s3 = sdf_cuboid(p, vec3(5.0, -2.05, 5.0), vec3(5.0, 1.0, 5.0));
  float s4 = sdf_cuboid(p, cube_pos, vec3(0.5, 1.5, 0.5));

  if ((mask & MESH) > 0 && s1 < MIN_DISTANCE) return 1;
  if ((mask & MESH) > 0 && s2 < MIN_DISTANCE) return 1;
  if ((mask & MESH) > 0 && s4 < MIN_DISTANCE) return 3;
  if ((mask & WATER) > 0 && s3 < MIN_DISTANCE) return 2;
  
  return 0;
}

vec3 render_mesh(vec3 ro, vec3 rd, float td, int id) {
  if (id == 0) {
    return texture(sky, rd).xyz;
  }

  vec3 p = ro + rd * td;
  vec3 N = sdf_normal(p, MESH);
  
  vec3 L = normalize(vec3(0.1, 1.0, -1.0));
  float NdotL = max(0.0, dot(N, L));
  float shade = shadow(p, L, MAX_DISTANCE, MESH, 64.0);
  
  return get_mesh_albedo(p, N, id) * (NdotL * shade + AMBIENCE);
}

vec3 get_mesh_albedo(vec3 p, vec3 N, int id) {
  if (id == 3) {
    return vec3(0.0, 1.0, 0.0);
  }
  
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
  if (fract(uv.y) > 0.5) alpha = (fract(uv.x) > 0.5 ? 1.0 : 0.95);
  else alpha = (fract(uv.x) < 0.5 ? 1.0 : 0.95);
  
  return vec3(alpha);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}  

vec3 get_water_normal(vec3 p) {
  ivec2 water_uv = ivec2((p.xz - vec2(5.0, 5.0)) / 5.0 * vec2(256.0, 256.0));
  vec2 u = texelFetch(water, water_uv, 0).xy;
  float du_dx = u.r - texelFetch(water, ivec2(water_uv.x - 1, water_uv.y), 0).x;
  float du_dy = u.r - texelFetch(water, ivec2(water_uv.x, water_uv.y - 1), 0).x;
  return normalize(vec3(-du_dx, 1.0, -du_dy));
}

vec3 render_water(vec3 ro, vec3 rd, float td) {
  vec3 p = ro + rd * td;
  vec3 N = get_water_normal(p);
  
  vec3 albedo = vec3(0.6, 0.9, 1.0);
  float metallic = 0.1;
  vec3 F0 = mix(vec3(0.04), albedo, metallic);
  vec3 kS = fresnelSchlick(max(dot(N, -rd), 0.3), F0);
  vec3 kD = (vec3(1.0) - kS) * (1.0 - metallic);
  
  vec3 color = vec3(0.0);
  {
    vec3 R = reflect(rd, N);
    vec3 q = p + R * 0.05;
    td = ray_march(q, R, MESH);
    int id = sdf_id(q + td * R, MESH);
    color += render_mesh(q, R, td, id) * kS;
  }
  
  {
    vec3 R = refract(rd, N, 1.0/1.33);
    vec3 q = p + R * 0.05;
    td = ray_march(q, R, MESH);
    int id = sdf_id(q + td * R, MESH);
    color += render_mesh(q, R, td, id) * kD * albedo;
  }
  
  vec3 L = normalize(vec3(0.1, 1.0, -1.0));
  float shade = shadow(p, L, 1000.0, MESH, 64.0);

  return color * (shade + AMBIENCE);
}
