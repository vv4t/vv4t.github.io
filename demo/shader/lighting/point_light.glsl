#ifndef LIGHT_GLSL
#define LIGHT_HLSL

#include "ggx.glsl"

struct light_t {
  vec3 position;
  vec3 radiance;
};

int lights_count();
light_t lights_get(int num);

vec3 calc_point_scatter(vec3 frag_pos, vec3 view_pos)
{
  vec3 total_radiance = vec3(0.0);
  
  for (int i = 0; i < lights_count(); i++) {
    light_t light = lights_get(i);
    
    vec3 delta_pos = light.position - frag_pos;
    vec3 light_dir = normalize(delta_pos);
    
    vec3 view_dir = normalize(frag_pos - view_pos);
    
    vec3 dir = normalize(light_dir - view_dir * dot(light_dir, view_dir));
    float h = dot(light.position, dir) - dot(view_pos, dir);
    float c = dot(light.position, view_dir);
    float a = dot(view_pos, view_dir) - c;
    float b = dot(frag_pos, view_dir) - c;
    float fog = atan(b / h) / h - atan(a / h) / h;
    
    total_radiance += (0.01 * fog) * light.radiance;
  }
  
  return total_radiance;
}

vec3 calc_point_lighting(vec3 p, vec3 V, vec3 N, vec3 albedo, float metallic, float roughness)
{
  vec3 total_radiance = vec3(0.0);
  
  for (int i = 0; i < lights_count(); i++) {
    light_t light = lights_get(i);
    
    vec3 L = normalize(light.position - p);
    float distance = length(light.position - p);
    
    float attenuation = 1.0 / (distance * distance);
    vec3 radiance = light.radiance * attenuation;
    
    total_radiance += BRDF(albedo, metallic, roughness, L, V, N) * radiance;
  }
  
  return total_radiance;
}

#endif
