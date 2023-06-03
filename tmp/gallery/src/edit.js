import { renderer_t } from "./renderer.js";
import { camera_t } from "./camera.js";
import { input_t } from "./input.js";
import { game_t } from "./game.js";
import { vec3_t } from "./math.js";
import { map_t } from "./map.js";
import { tool_t } from "./tool.js";
import { init_gl } from "./gl.js";

function main()
{
  init_gl(document.getElementById("display"));
  
  const file = document.getElementById("file");
  const import_file = document.getElementById("import");
  const collision = document.getElementById("collision");
  
  const map = new map_t();
  const renderer = new renderer_t();
  const camera = new camera_t();
  const input = new input_t();
  const game = new game_t();
  const tool = new tool_t(map, renderer);
  
  renderer.load_map_edit(map);
  
  camera.position.x = 25.0;
  camera.position.y = 0.5;
  camera.position.z = 25.0;
  
  setInterval(function() {
    game.move_camera(camera, input, map);
    tool.edit_map(camera, input);
    
    renderer.clear();
    renderer.draw_room(camera, map);
    renderer.draw_wall(camera, tool);
  }, 15);
  
  document.getElementById("delete_image").onclick = () => tool.remove_selected_image();
  
  document.getElementById("save").onclick = () => {
    const json = JSON.stringify(map.export_file());
    
    const file = new Blob([json], {type: "text/plain"});
    const url = URL.createObjectURL(file, "map.json");
    const a = document.createElement("a");
    a.href = url;
    a.download = "map.json";
    document.body.appendChild(a);
    a.click();
    
    setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  };
  
  collision.addEventListener("change", (e) => {
    game.no_clip = !collision.checked;
  });
  
  file.addEventListener("change", (e) => {
    const url = URL.createObjectURL(e.target.files[0]);
    const image = new Image();
    image.src = url;
    image.onload = () => {
      map.add_image(image);
    };
  });
  
  import_file.addEventListener("change", (e) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      map.import_file(JSON.parse(e.target.result), renderer);
    };
    reader.readAsText(e.target.files[0]);
  });
}

main();
