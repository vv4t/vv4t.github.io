#define MAX_DISTANCE 64.0

#include "../util/math.glsl"
#include "../util/march.glsl"
#include "../util/ggx.glsl"
#include "../util/light.glsl"

#define TILE (1 << 0)
#define LIGHT (1 << 1)
#define WORLD (TILE | LIGHT)
#define WATER (1 << 2)

light_t lights_get(int num);
int lights_count();

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

out vec4 frag_color;

uniform sampler2D water;
uniform sampler2D tile_albedo;
uniform sampler2D tile_normal;
uniform sampler2D tile_roughness;

vec3 get_water_normal(vec3 p);
vec3 shade_water(vec3 p, vec3 ro, vec3 rd);
vec3 shade_world(vec3 p, int id, vec3 ro);

int map_id(vec3 p, int mask);
float scatter(vec3 frag_pos, vec3 view_pos);

void main() {
  vec2 screen_pos = gl_FragCoord.xy / 300.0 * 2.0 - 1.0;
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  vec3 ro = view_pos;
  vec3 rd = normalize((view_mat * vec4(screen_pos, 1.0, 1.0)).xyz);
  
  float td = ray_march(ro, rd, WORLD | WATER);
  vec3 p = ro + rd * td;
  int id = map_id(p, WORLD | WATER);
  
  vec3 color = vec3(0.0);
  if (id < 10) {
    color = shade_world(p, id, ro);
  } else if (id == 10) {
    color = shade_water(p, ro, rd);
  } else {
    color = vec3(0.0);
  }
  
  color += calc_point_scatter(p, ro, 0.01);
  
  frag_color = vec4(color, 1.0);
}

vec3 shade_water(vec3 p, vec3 ro, vec3 rd) {
  vec3 N = get_water_normal(p);
  
  vec3 albedo = vec3(0.4, 1.0, 1.0);
  float absorb = 0.1;
  
  vec3 F0 = mix(vec3(0.04), albedo, absorb);
  vec3 kS = fresnelSchlick(max(dot(N, -rd), 0.0), F0);
  vec3 kD = (vec3(1.0) - kS) * (1.0 - absorb);
  
  vec3 color = vec3(0.0);
  {
    vec3 R = reflect(rd, N);
    float td = ray_march(p, R, WORLD);
    vec3 q = p + td * R;
    int id = map_id(q, WORLD);
    color += shade_world(q, id, p) * kS;
  }
  
  {
    vec3 R = refract(rd, N, 1.0/1.33);
    float td = ray_march(p, R, WORLD);
    vec3 q = p + td * R;
    int id = map_id(q, WORLD);
    color += mix(albedo, shade_world(q, id, p), exp(-0.01 * td)) * kD;
  }

  return color;
}

vec3 shade_world(vec3 p, int id, vec3 ro) {
  vec3 color = vec3(0.0);
  if (id == 1) {
    mat3 TBN = axis_aligned_TBN(p, TILE);
    vec2 uv = fract((transpose(TBN) * p).xy * 0.25);
    vec3 N = TBN * normalize(texture(tile_normal, uv).xyz * 2.0 - 1.0);
    vec3 V = normalize(ro - p);
    
    vec3 albedo = texture(tile_albedo, uv).xyz;
    float roughness = texture(tile_roughness, uv).x;
    
    color = calc_point_lighting(p, V, N, albedo, 0.1, roughness);
  } else if (id == 2) {
    color = lights_get(0).radiance;
  } else if (id == 3) {
    color = lights_get(1).radiance;
  } else {
    return vec3(0.0);
  }
  
  return color;
}

float sdf(vec3 p, int mask) {
  float d = MAX_DISTANCE;
  
  if ((mask & TILE) > 0) {
    float s1 = d;
    s1 = min(s1, sdf_plane(p, vec3(+1.0, 0.0, 0.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, +1.0, 0.0), -1.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, 0.0, +1.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(-1.0, 0.0, 0.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, -1.0, 0.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, 0.0, -1.0), -5.0));
    s1 = sdf_sub(s1, sdf_cuboid(p, vec3(-500.0, 0.0, -5.0), vec3(500.0, 5.0, 7.0)));
    d = min(d, s1);
  }
  
  if ((mask & LIGHT) > 0) {
    float s1 = sdf_sphere(p, vec3(+2.0, 4.0, 0.0), 0.5);
    float s2 = sdf_sphere(p, vec3(-2.0, 4.0, 0.0), 0.5);
    d = min(d, s1);
    d = min(d, s2);
  }
  
  if ((mask & WATER) > 0) {
    float s1 = sdf_plane(p, vec3(0.0, 1.0, 0.0), 0.0);
    d = min(d, s1);
  }
  
  return d;
}

int map_id(vec3 p, int mask) {
  if ((mask & TILE) > 0) {
    float s1 = MAX_DISTANCE;
    s1 = min(s1, sdf_plane(p, vec3(+1.0, 0.0, 0.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, +1.0, 0.0), -1.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, 0.0, +1.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(-1.0, 0.0, 0.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, -1.0, 0.0), -5.0));
    s1 = min(s1, sdf_plane(p, vec3(0.0, 0.0, -1.0), -5.0));
    s1 = sdf_sub(s1, sdf_cuboid(p, vec3(-500.0, 0.0, -5.0), vec3(500.0, 5.0, 7.0)));
    if (s1 < MIN_DISTANCE) return 1;
  }
  
  if ((mask & LIGHT) > 0) {
    float s1 = sdf_sphere(p, vec3(+2.0, 4.0, 0.0), 0.5);
    float s2 = sdf_sphere(p, vec3(-2.0, 4.0, 0.0), 0.5);
    if (s1 < MIN_DISTANCE) return 2;
    if (s2 < MIN_DISTANCE) return 3;
  }
  
  if ((mask & WATER) > 0) {
    float s1 = sdf_plane(p, vec3(0.0, 1.0, 0.0), 0.0);
    if (s1 < MIN_DISTANCE) return 10;
  }
  
  return 0;
}

vec3 get_water_normal(vec3 p) {
  ivec2 water_uv = ivec2((p.xz - vec2(-5.0)) / 10.0 * vec2(256.0, 256.0));
  vec2 u = texelFetch(water, water_uv, 0).xy;
  float du_dx = u.r - texelFetch(water, ivec2(water_uv.x - 1, water_uv.y), 0).x;
  float du_dy = u.r - texelFetch(water, ivec2(water_uv.x, water_uv.y - 1), 0).x;
  return normalize(vec3(-du_dx, 1.0, -du_dy));
}

light_t lights[] = light_t[](
  light_t(vec3(+2.0, 4.0, 0.0), vec3(0.4, 1.0, 1.0) * 10.0),
  light_t(vec3(-2.0, 4.0, 0.0), vec3(1.0, 0.4, 1.0) * 10.0)
);

light_t lights_get(int num) {
  return lights[num];
}

int lights_count() {
  return 2;
}
