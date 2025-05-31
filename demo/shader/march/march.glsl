#ifndef RAY_MARCH_GLSL
#define RAY_MARCH_GLSL

#define MIN_DISTANCE 0.0001
#define MAX_STEPS 256

#ifndef MAX_DISTANCE
  #define MAX_DISTANCE 10.0
#endif

struct trace_t {
  float d;
  int id;
};

trace_t trace(int id, float d) {
  trace_t tr;
  tr.id = id;
  tr.d = d;
  return tr;
}

trace_t tr_add(trace_t a, trace_t b) {
  if (a.d < b.d)
    return a;
  else
    return b;
}

trace_t sdf(vec3 p);

vec3 sdf_normal(vec3 p) {
  float dp = 0.001;
  
  trace_t dx_a = sdf(p - vec3(dp, 0.0, 0.0));
  trace_t dy_a = sdf(p - vec3(0.0, dp, 0.0));
  trace_t dz_a = sdf(p - vec3(0.0, 0.0, dp));
  
  trace_t dx_b = sdf(p + vec3(dp, 0.0, 0.0));
  trace_t dy_b = sdf(p + vec3(0.0, dp, 0.0));
  trace_t dz_b = sdf(p + vec3(0.0, 0.0, dp));
  
  return normalize(vec3(dx_b.d - dx_a.d, dy_b.d - dy_a.d, dz_b.d - dz_a.d));
}

float shadow(vec3 pt, vec3 rd, float ld) {
  vec3 p = pt;
  float td = 0.01;
  float kd = 1.0;
  
  for (int i = 0; i < MAX_STEPS && kd > 0.01; i++) {
    p = pt + rd * td;
    
    trace_t tr = sdf(p);
    
    if (td > MAX_DISTANCE || td + tr.d > ld) break;
    if (tr.d < 0.001) kd = 0.0;
    else kd = min(kd, 16.0 * tr.d / td);
    
    td += tr.d;
  }
  
  return kd;
}

trace_t ray_march(vec3 ro, vec3 rd) {
  float td = 0.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    trace_t tr = sdf(ro + rd * td);
    if (tr.d < MIN_DISTANCE) return trace(tr.id, td);
    if (td > MAX_DISTANCE) break;
    td += tr.d;
  }
  
  return trace(0, MAX_DISTANCE);
}

float sdf_union(float a, float b) {
  return min(a, b);
}

float sdf_sub(float a, float b) {
  return max(a, -(b - 0.05));
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
