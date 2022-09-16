"use strict";

export class camera_t {
  constructor(pos, rot)
  {
    this.pos = pos;
    this.rot = rot;
  }
  
  space(pos)
  {
    const cam_pos = pos.sub(this.pos);
    const cam_rot = cam_pos.rotate_zyx(this.rot.mulf(-1));
    return cam_rot;
  }
};
