#ifndef TRACE_GLSL
#define TRACE_GLSL

#ifndef MAX_DISTANCE
  #define MAX_DISTANCE 1000000.0
#endif

float trace_plane(vec3 ro, vec3 rd, vec3 N, float d) {
  float td = dot(N * d - ro, N) / dot(rd, N);
  return td < 0.0 ? MAX_DISTANCE : td;
}

#endif
