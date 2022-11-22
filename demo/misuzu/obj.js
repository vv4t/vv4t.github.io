"use strict";

import { file_load } from "./file.js";
import { clamp, vec2_t, vec3_t } from "../wire-3d/math.js";

export class face_t {
  constructor(vertices, normal)
  {
    this.vertices = vertices;
    this.normal = normal;
  }
};

export class mesh_t {
  constructor(faces)
  {
    this.faces = faces;
  }
};

export class model_t {
  constructor(meshes)
  {
    this.meshes = meshes;
  }
};

export function obj_load(path, on_load)
{
  file_load(path, (data) => {
    const lines = data.split("\n");
    
    const v_list = [];
    const vn_list = [];
    const f_list = [];
    
    let faces = [];
    const meshes = [];
    
    for (const line of lines) {
      const args = line.split(" ");
      
      if (args[0] == "v") {
        const v = new vec3_t(
          parseFloat(args[1]),
          parseFloat(args[2]),
          parseFloat(args[3]));
        
        v_list.push(v);
      } else if (args[0] == "vn") {
        const vn = new vec3_t(
          parseFloat(args[1]),
          parseFloat(args[2]),
          parseFloat(args[3]));
        
        vn_list.push(vn);
      } else if (args[0] == "f") {
        const vertices = [];
        let normal;
        
        for (let i = 1; i < 4; i++) {
          const vert_ids = args[i].split("/");
          
          const v_id = vert_ids[0];
          const vt_id = vert_ids[1];
          const vn_id = vert_ids[2];
          
          const vertex = v_list[v_id - 1];
          normal = vn_list[vn_id - 1];
          
          vertices.push(vertex);
        }
        
        const face = new face_t(vertices, normal);
        faces.push(face);
      } else if (args[0] == "o" && faces.length > 0) {
        meshes.push(new mesh_t(faces));
        faces = [];
      }
    }
    
    if (faces.length > 0)
      meshes.push(new mesh_t(faces));
    
    const model = new model_t(meshes);
    on_load(model);
  });
}
