#ifndef RAY_MARCH_GLSL
#define RAY_MARCH_GLSL

#define MIN_DISTANCE 0.001
#define MAX_STEPS 256

#ifndef MAX_DISTANCE
  #define MAX_DISTANCE 10.0
#endif

float sdf(vec3 p, int mask);

vec3 sdf_normal(vec3 p, int mask) {
  float dp = 0.001;
  
  float dx_a = sdf(p - vec3(dp, 0.0, 0.0), mask);
  float dy_a = sdf(p - vec3(0.0, dp, 0.0), mask);
  float dz_a = sdf(p - vec3(0.0, 0.0, dp), mask);
  
  float dx_b = sdf(p + vec3(dp, 0.0, 0.0), mask);
  float dy_b = sdf(p + vec3(0.0, dp, 0.0), mask);
  float dz_b = sdf(p + vec3(0.0, 0.0, dp), mask);
  
  return normalize(vec3(dx_b - dx_a, dy_b - dy_a, dz_b - dz_a));
}

float shadow(vec3 pt, vec3 rd, float ld, int mask) {
  vec3 p = pt;
  float td = 0.05;
  float kd = 1.0;
  
  for (int i = 0; i < MAX_STEPS && kd > 0.01; i++) {
    p = pt + rd * td;
    
    float d = sdf(p, mask);
    if (td > MAX_DISTANCE || td + d > ld) break;
    if (d < 0.001) kd = 0.0;
    else kd = min(kd, 64.0 * d / td);
    
    td += d;
  }
  
  return kd;
}

float ray_march(vec3 ro, vec3 rd, int mask) {
  float td = 0.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    float d = sdf(ro + rd * td, mask);
    if (d < MIN_DISTANCE) return td;
    if (td > MAX_DISTANCE) break;
    td += d;
  }
  
  return MAX_DISTANCE;
}

float sdf_union(float a, float b) {
  return min(a, b);
}

float sdf_sub(float a, float b) {
  return max(a, -b);
}

float sdf_and(float a, float b) {
  return max(a, b);
}

float sdf_smooth_union(float a, float b, float k) {
  float h = clamp( 0.5 + 0.5*(b-a)/k, 0.0, 1.0 );
  return mix(b, a, h) - k*h*(1.0-h);
}

float sdf_cuboid(vec3 p, vec3 o, vec3 s) {
  s *= 0.5;
  o += s;
  vec3 d = abs(p - o) - s;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float sdf_sphere(vec3 p, vec3 o, float r) {
  return length(p - o) - r;
}

float sdf_cylinder(vec3 p, vec3 o, float r, float h) {
  h /= 2.0;
  p -= o;
  p.y -= h;
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdf_plane(vec3 p, vec3 n, float d) {
  return dot(p, n) - d;
}

#endif
