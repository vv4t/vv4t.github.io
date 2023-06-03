import { vec3_t, mat4_t, deg2rad } from "./math.js";

export class camera_t
{
  constructor()
  {
    this.position = new vec3_t(0.0, 0.0, 0.0);
    this.rotation = 0.0;
    this.projection_matrix = new mat4_t().init_perspective(9.0/16.0, deg2rad(65.0), 0.1, 100.0);
  }
  
  calc_mvp(model_matrix)
  {
    return model_matrix.mul(this.calc_matrix());
  }
  
  calc_matrix()
  {
    const translation_matrix = new mat4_t().init_translation(this.position.mulf(-1.0));
    const rotation_matrix = new mat4_t().init_y_rotation(this.rotation);
    
    const view_matrix = translation_matrix.mul(rotation_matrix);
    
    return view_matrix.mul(this.projection_matrix);
  }
}
