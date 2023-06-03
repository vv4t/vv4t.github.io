import { renderer_t } from "./renderer.js";
import { camera_t } from "./camera.js";
import { input_t } from "./input.js";
import { game_t } from "./game.js";
import { map_t } from "./map.js";
import { init_gl } from "./gl.js";
import { texture_preload } from "./texture.js";
import { playlist } from "./playlist.js";

function main(file)
{
  const canvas = document.getElementById("display");
  init_gl(canvas);
  
  const map = new map_t();
  const renderer = new renderer_t();
  const camera = new camera_t();
  const input = new input_t();
  const game = new game_t();
  
  map.import_file(file);
  renderer.load_map_play(map);
  
  map.listen("load", () => {
    play_audio();
    
    game.no_clip = false;
    camera.position.x = 25.0;
    camera.position.y = 0.5;
    camera.position.z = 25.0;
    
    setInterval(function() {
      auto_resize(canvas);
      
      game.move_camera(camera, input, map);
      
      renderer.clear();
      renderer.draw(camera, canvas.width, canvas.height);
    }, 15);
  });
}

function play_audio()
{
  let track_no = 0;
  
  const sound = document.createElement("audio");
  sound.src = playlist[track_no++];
  sound.setAttribute("preload", "auto");
  sound.setAttribute("controls", "none");
  sound.style.display = "none";
  document.body.appendChild(sound);
  
  sound.addEventListener("ended", () => {
    sound.src = playlist[track_no++ % playlist.length];
    sound.play();
  });
  
  sound.play();
}

function auto_resize(canvas)
{
  let width = document.body.clientHeight * 16.0 / 9.0;
  let height = document.body.clientHeight;
  
  if (height * 16.0 / 9.0 > document.body.clientWidth) {
    width = document.body.clientWidth; 
    height = document.body.clientWidth / 16.0 * 9.0; 
  }
  
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
  }
      
}

function run()
{
  document.getElementById("display").style.visibility = "visible";
  document.getElementById("bar").style.visibility = "visible";
  document.getElementById("enter").style.visibility = "hidden";
  
  let count = 0;
  let progress = 0;
  
  texture_preload("assets/images/floor.png", () => count++ );
  texture_preload("assets/images/ceil.png", () => count++ );
  
  const xhr = new XMLHttpRequest();
  xhr.addEventListener("load", () => {
    count++;
  });
  xhr.addEventListener("progress", (e) => {
    progress = e.loaded / e.total;
  });
  xhr.open("GET", "map.json");
  xhr.send();
  
  const check_load = setInterval(function() {
    if (count == 3) {
      clearInterval(check_load);
      main(JSON.parse(xhr.responseText));
      document.getElementById("bar").style.visibility = "hidden";
    } else {
      document.getElementById("progress").style.width = progress * 100 + "%";
    }
  }, 15);
}

window.run = run;
