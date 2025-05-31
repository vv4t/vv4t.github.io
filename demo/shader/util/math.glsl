#ifndef MATH_H
#define MATH_H

#define M_PI 3.14159265358979323846264338327950288

mat4 rotate_x(float t)
{
  return mat4(
    vec4(1.0, 0.0, 0.0, 0.0),
    vec4(0.0, cos(t), -sin(t), 0.0),
    vec4(0.0, sin(t), cos(t), 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

mat4 rotate_y(float t)
{
  return mat4(
    vec4(cos(t), 0.0, -sin(t), 0.0),
    vec4(0.0, 1.0, 0.0, 0.0),
    vec4(sin(t), 0.0, cos(t), 0.0),
    vec4(0.0, 0.0, 0.0, 1.0)
  );
}

#endif
