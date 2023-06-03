import { vertex_t, buffer_t } from "./buffer.js";
import { shader_t } from "./shader.js";
import { texture_load_url, texture_load_image } from "./texture.js";
import { gl } from "./gl.js";
import { vec3_t, mat4_t } from "./math.js";

function build_wall(pos, side, up)
{
  const zero = new vec3_t(0, 0, 0);
  
  const u = side.length();
  const v = up.length();
  
  return [
    new vertex_t(zero.add(pos), 0, v),
    new vertex_t(up.add(pos), 0, 0),
    new vertex_t(side.add(pos), u, v),
    
    new vertex_t(up.add(pos), 0, 0),
    new vertex_t(side.add(up).add(pos), u, 0),
    new vertex_t(side.add(pos), u, v)
  ];
}

export class renderer_t
{
  constructor()
  {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    this.shader = new shader_t();
    this.buffer = new buffer_t(this.shader.program);
    
    this.floor_tex = texture_load_url("assets/images/floor.png");
    this.ceil_tex = texture_load_url("assets/images/ceil.png");
    
    this.wall_tex = [];
    
    this.shader.bind();
    gl.activeTexture(gl.TEXTURE0);
    
  }
  
  load_map_play(map)
  {
    this.floor_mesh = this.buffer.new_mesh(
      build_wall(
        new vec3_t(-250, 0, -250),
        vec3_t.right.mulf(500),
        vec3_t.forward.mulf(500)
      )
    );
    
    this.ceil_mesh = this.buffer.new_mesh(
      build_wall(
        new vec3_t(-250, 1, -250),
        vec3_t.right.mulf(500),
        vec3_t.forward.mulf(500)
      )
    );
    
    map.listen("add_image", (image) => {
      this.wall_tex.push(texture_load_image(image));
    });
    
    map.listen("load", () => {
      const meshes_vertices = [];
      
      for (let i = 0; i < map.images.length; i++)
        meshes_vertices.push([]);
      
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const pos = new vec3_t(x, 0, y);
          
          if (map.walls[y][x].back) {
            meshes_vertices[map.walls[y][x].back - 1].push(...build_wall(pos, vec3_t.right, vec3_t.up));
          }
          
          if (map.walls[y][x].left) {
            meshes_vertices[map.walls[y][x].left - 1].push(...build_wall(pos, vec3_t.forward, vec3_t.up));
          }
        }
      }
      
      this.wall_meshes = [];
      for (const vertices of meshes_vertices) {
        this.wall_meshes.push(this.buffer.new_mesh(vertices));
      }
    });
  }
  
  load_map_edit(map)
  {
    this.floor_mesh = this.buffer.new_mesh(
      build_wall(
        vec3_t.zero,
        vec3_t.right.mulf(map.width),
        vec3_t.forward.mulf(map.height)
      )
    );
    
    this.ceil_mesh = this.buffer.new_mesh(
      build_wall(
        vec3_t.up,
        vec3_t.right.mulf(map.width),
        vec3_t.forward.mulf(map.height)
      )
    );
    
    this.wall_mesh = this.buffer.new_mesh(
      build_wall(vec3_t.zero, vec3_t.right, vec3_t.up)
    );
    
    map.listen("add_image", (image) => {
      this.wall_tex.push(texture_load_image(image));
    });
    
    map.listen("remove_image", (id) => {
      gl.deleteTexture(this.wall_tex[id - 1]);
      this.wall_tex.splice(id - 1, 1);
    });
    
    map.listen("flush", () => {
      for (const tex in this.wall_tex)
        gl.deleteTexture(tex);
      
      this.wall_tex = [];
    });
  }
  
  clear()
  {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }
  
  draw_wall(camera, tool)
  {
    if (tool.wall_id == 0)
      return;
    
    const pos = tool.wall_pos;
    
    if (tool.wall_side) {
      if (camera.position.x < pos.x)
        pos.x -= 0.01;
      else
        pos.x += 0.01;
    } else {
      if (camera.position.z < pos.z)
        pos.z -= 0.01;
      else
        pos.z += 0.01;
    }
    
    const y_rot = tool.wall_side ? Math.PI / 2.0 : 0;
    
    const translation_matrix = new mat4_t().init_translation(pos);
    const rotation_matrix = new mat4_t().init_y_rotation(y_rot);
    const model_matrix = rotation_matrix.mul(translation_matrix);
    const mvp = camera.calc_mvp(model_matrix);
    
    this.shader.set_mvp(mvp);
    this.shader.set_opacity(0.6);
    
    gl.bindTexture(gl.TEXTURE_2D, this.wall_tex[tool.wall_id - 1]);
    gl.drawArrays(gl.TRIANGLES, this.wall_mesh.offset, this.wall_mesh.count);
  }
  
  draw(camera, width, height)
  {
    gl.viewport(0, 0, width, height);
    
    this.shader.set_mvp(camera.calc_matrix());
    this.shader.set_opacity(1.0);
    
    gl.bindTexture(gl.TEXTURE_2D, this.floor_tex);
    gl.drawArrays(gl.TRIANGLES, this.floor_mesh.offset, this.floor_mesh.count);
    
    gl.bindTexture(gl.TEXTURE_2D, this.ceil_tex);
    gl.drawArrays(gl.TRIANGLES, this.ceil_mesh.offset, this.ceil_mesh.count);
    
    for (let i = 0; i < this.wall_tex.length; i++) {
      gl.bindTexture(gl.TEXTURE_2D, this.wall_tex[i]);
      gl.drawArrays(gl.TRIANGLES, this.wall_meshes[i].offset, this.wall_meshes[i].count);
    }
  }
  
  draw_room(camera, map)
  {
    this.shader.set_mvp(camera.calc_matrix());
    this.shader.set_opacity(1.0);
    
    gl.bindTexture(gl.TEXTURE_2D, this.floor_tex);
    gl.drawArrays(gl.TRIANGLES, this.floor_mesh.offset, this.floor_mesh.count);
    
    gl.bindTexture(gl.TEXTURE_2D, this.ceil_tex);
    gl.drawArrays(gl.TRIANGLES, this.ceil_mesh.offset, this.ceil_mesh.count);
    
    this.shader.set_opacity(1.0);
    
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.walls[y][x].back) {
          const model_matrix = new mat4_t().init_translation(new vec3_t(x, 0, y));
          const mvp = camera.calc_mvp(model_matrix);
          
          this.shader.set_mvp(mvp);
          gl.bindTexture(gl.TEXTURE_2D, this.wall_tex[map.walls[y][x].back - 1]);
          gl.drawArrays(gl.TRIANGLES, this.wall_mesh.offset, this.wall_mesh.count);
        }
        
        if (map.walls[y][x].left) {
          const translation_matrix = new mat4_t().init_translation(new vec3_t(x, 0, y));
          const rotation_matrix = new mat4_t().init_y_rotation(Math.PI / 2.0);
          const model_matrix = rotation_matrix.mul(translation_matrix);
          const mvp = camera.calc_mvp(model_matrix);
          
          this.shader.set_mvp(mvp);
          gl.bindTexture(gl.TEXTURE_2D, this.wall_tex[map.walls[y][x].left - 1]);
          gl.drawArrays(gl.TRIANGLES, this.wall_mesh.offset, this.wall_mesh.count);
        }
      }
    }
  }
}
