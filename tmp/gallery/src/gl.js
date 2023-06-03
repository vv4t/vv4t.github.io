export let gl;
export function init_gl(canvas) {
  gl = canvas.getContext("webgl");
}
