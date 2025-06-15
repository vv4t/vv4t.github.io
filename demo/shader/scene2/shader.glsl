#define MAX_DISTANCE 64.0

#include "../util/math.glsl"
#include "../util/march.glsl"
#include "../util/ggx.glsl"
#include "../util/light.glsl"

#define WORLD (1 << 0)
#define ELLIPSOID (1 << 1)
#define LAMP (1 << 2)

layout (std140) uniform ubo {
  vec3 view_pos;
  float view_yaw;
  float view_pitch;
};

out vec4 frag_color;
int map_id(vec3 p, int mask);

uniform sampler2D tile_albedo;
uniform sampler2D tile_normal;
uniform sampler2D tile_roughness;

vec3 shade_world(vec3 p, vec3 ro, int id);
float sdf_pillar(vec3 p, vec3 o, float r, float h);

light_t lights_get(int num);
int lights_count();

void main() {
  vec2 screen_pos = gl_FragCoord.xy / 300.0 * 2.0 - 1.0;
  mat4 view_mat = mat4(1.0) * rotate_y(view_yaw) * rotate_x(view_pitch);
  vec3 ro = view_pos;
  vec3 rd = normalize((view_mat * vec4(screen_pos, 1.0, 1.0)).xyz);
  
  float td = ray_march(ro, rd, WORLD | ELLIPSOID | LAMP);
  vec3 p = ro + rd * td;
  int id = map_id(p, WORLD | ELLIPSOID | LAMP);
  
  vec3 color = vec3(0.0);
  if (id == 3) {
    vec3 N = sdf_normal(p, WORLD | ELLIPSOID | LAMP);
    vec3 V = normalize(ro - p);
    vec3 R = reflect(rd, N);
    
    td = ray_march(p, R, WORLD);
    vec3 q = p + R * td;
    
    vec3 albedo = vec3(0.4);
    
    vec3 radiance = vec3(0.0);
    radiance += GGX(albedo, 0.4, 0.4, -R, V, N) * shade_world(q, p, map_id(q, WORLD | LAMP)) * 5.0;
    color = radiance;
  } else {
    color = shade_world(p, ro, id);
  }
  
  frag_color = vec4(color, 1.0);
}

vec3 shade_world(vec3 p, vec3 ro, int id) {
  vec3 V = normalize(ro - p);
  
  vec3 color = vec3(0.0);
  if (id == 1) {
    mat3 TBN = axis_aligned_TBN(p, WORLD | LAMP);
    vec2 uv = fract((transpose(TBN) * p).xy * 0.25);
    
    vec3 albedo = texture(tile_albedo, uv).xyz;
    vec3 normal = TBN * normalize(texture(tile_normal, uv).xyz * 2.0 - 1.0);
    float roughness = texture(tile_roughness, uv).x;
    
    color = calc_point_lighting_with_shadow(p, V, normal, albedo, 0.1, roughness, WORLD | ELLIPSOID, 16.0);
  } else if (id == 2) {
    vec3 N = sdf_normal(p, WORLD | LAMP);
    color = calc_point_lighting(p, V, N, vec3(0.1), 0.4, 0.3);
  } else if (id == 4) {
    return lights_get(0).radiance;
  } else if (id == 5) {
    vec3 N = sdf_normal(p, WORLD | LAMP);
    color = calc_point_lighting(p, V, N, vec3(0.8), 0.1, 0.5);
  }
  
  color += calc_point_scatter(p, ro, 0.001);
  
  return color;
}

float sdf(vec3 p, int mask) {
  float d = MAX_DISTANCE;
  
  if ((mask & WORLD) > 0) {
    float s1 = sdf_plane(p, vec3(0.0, +1.0, 0.0), 0.0);
    float s2 = (
      sdf_union(sdf_pillar(p, vec3(0.0, 0.0, 25.0), 2.5, 50.0),
      sdf_union(sdf_pillar(p, vec3(-15.0, 0.0, 15.0), 2.5, 50.0),
      sdf_pillar(p, vec3(10.0, 0.0, -10.0), 2.5, 50.0)
    )));
    
    d = min(d, s1);
    d = min(d, s2);
  }
  
  if ((mask & LAMP) > 0) {
    float s1 = (
      sdf_union(sdf_cylinder(p, vec3(0.0, 0.0, 5.0), 0.2, 7.0),
      sdf_union(sdf_cylinder(p, vec3(0.0, 1.5, 5.0), 0.7, 0.1),
      sdf_union(sdf_cylinder(p, vec3(0.0, 0.0, 5.0), 0.5, 1.5),
      sdf_cylinder(p, vec3(0.0, 0.0, 5.0), 1.0, 0.15)
    ))));
    float s2 = sdf_sphere(p, vec3(0.0, 7.0, 5.0), 0.7);
    
    d = min(d, s1);
    d = min(d, s2);
  }
  
  if ((mask & ELLIPSOID) > 0) {
    float s1 = sdf_sphere(p * vec3(1.0, 1.5, 1.0), vec3(6.0, 0.8, 3.0), 2.0);
    d = min(d, s1);
  }
  
  return d;
}

int map_id(vec3 p, int mask) {
  float s1 = sdf_plane(p, vec3(0.0, +1.0, 0.0), 0.0);
  float s2 = (
    sdf_union(sdf_cylinder(p, vec3(0.0, 0.0, 5.0), 0.2, 7.0),
    sdf_union(sdf_cylinder(p, vec3(0.0, 1.5, 5.0), 0.7, 0.1),
    sdf_union(sdf_cylinder(p, vec3(0.0, 0.0, 5.0), 0.5, 1.5),
    sdf_cylinder(p, vec3(0.0, 0.0, 5.0), 1.0, 0.15)
  ))));
  float s3 = sdf_sphere(p, vec3(0.0, 7.0, 5.0), 0.7);
  float s4 = (
    sdf_union(sdf_pillar(p, vec3(0.0, 0.0, 25.0), 2.5, 50.0),
    sdf_union(sdf_pillar(p, vec3(-15.0, 0.0, 15.0), 2.5, 50.0),
    sdf_pillar(p, vec3(10.0, 0.0, -10.0), 2.5, 50.0)
  )));
  float s5 = sdf_sphere(p * vec3(1.0, 1.5, 1.0), vec3(6.0, 0.8, 3.0), 2.0);
  
  if ((mask & WORLD) > 0 && s1 < MIN_DISTANCE) return 1;
  if ((mask & LAMP) > 0 && s2 < MIN_DISTANCE) return 2;
  if ((mask & LAMP) > 0 && s3 < MIN_DISTANCE) return 4;
  if ((mask & WORLD) > 0 && s4 < MIN_DISTANCE) return 5;
  if ((mask & ELLIPSOID) > 0 && s5 < MIN_DISTANCE) return 3;
  return 0;
}

float sdf_pillar(vec3 p, vec3 o, float r, float h) {
  h /= 2.0;
  
  vec3 q = p;
  q -= o;
  q.y -= h;
  
  float x = atan(q.z, q.x);
  float y = 1.0 - pow(sin(10.0 * x), 2.0) / 20.0;
  float z = r * y;
  
  vec2 d = abs(vec2(length(q.xz), q.y)) - vec2(z, h);
  float w = 1.15 * r;
  
  float s1 = min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
  float s2 = sdf_cuboid(p, o + vec3(-w, 0.0, -w), 2.0 * vec3(w, 0.5, w));
  float s3 = sdf_cuboid(p, o + vec3(-w, h * 2.0, -w), 2.0 * vec3(w, 0.5, w));
  
  return sdf_union(s1, sdf_union(s2, s3));
}

light_t lights[] = light_t[](
  light_t(vec3(0.0, 7.0, 5.0), vec3(0.4, 0.4, 1.0) * 100.0)
);

light_t lights_get(int num) {
  return lights[num];
}

int lights_count() {
  return 1;
}
