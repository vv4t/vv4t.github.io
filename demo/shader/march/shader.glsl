#include "../util/math.glsl"
#include "march.glsl"

layout (std140) uniform ubo {
  vec3 view_pos;
  float yaw;
  float pitch;
};

out vec4 frag_color;
uniform samplerCube sky;

int sdf_id(vec3 p);

void main() {
  vec2 uv = (gl_FragCoord.xy / 600.0 * 2.0 - 1.0);
  
  vec3 view_pos = view_pos;
  mat4 view_mat = mat4(1.0) * rotate_y(yaw) * rotate_x(pitch);
  vec3 rd = normalize((view_mat * vec4(uv, 1.0, 1.0)).xyz);
  
  float td = ray_march(view_pos, rd, 0);
  vec3 p = view_pos + rd * td;
  vec3 N = sdf_normal(p, 0);
  int id = sdf_id(p);
  
  vec3 L = normalize(vec3(-1.0, 5.0, -1.0));
  float NdotL = max(0.0, dot(N, L));
  
  vec3 color;
  if (id == 1) {
    color = NdotL * vec3(1.0);
  } else if (id == 2) {
    color = NdotL * vec3(1.0, 0.5, 1.0);
  } else {
    color = texture(sky, rd).xyz;
  }
  
  frag_color = vec4(color, 1.0);
}

float sdf(vec3 p, int mask) {
  float s1 = sdf_sub(
    sdf_cuboid(p, vec3(0.0, -2.0, 1.0), vec3(4.0, 1.0, 1.0)),
    sdf_cuboid(p, vec3(0.0, -1.5, 1.0), vec3(1.0))
  );
  
  float s2 = sdf_smooth_union(
    sdf_sphere(p, vec3(3.0, -2.0, 0.0), 1.0),
    sdf_cuboid(p, vec3(2.6, -2.0, -0.4), vec3(0.8, 1.0, 0.8)),
    0.5
  );
  
  return min(s1, s2);
}

int sdf_id(vec3 p) {
  float s1 = sdf_sub(
    sdf_cuboid(p, vec3(0.0, -2.0, 1.0), vec3(4.0, 1.0, 1.0)),
    sdf_cuboid(p, vec3(0.0, -1.5, 1.0), vec3(1.0))
  );
  
  float s2 = sdf_smooth_union(
    sdf_sphere(p, vec3(3.0, -2.0, 0.0), 1.0),
    sdf_cuboid(p, vec3(2.6, -2.0, -0.4), vec3(0.8, 1.0, 0.8)),
    0.5
  );
  
  if (s1 < MIN_DISTANCE) return 1;
  if (s2 < MIN_DISTANCE) return 2;
  
  return 0;
}
