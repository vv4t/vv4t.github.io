"use strict";

import { vec2_t, to_rad } from "./math.js";
import { draw_t } from "./draw.js";
import { input_t } from "./input.js";
import { map_t } from "./map.js";
import { car_t } from "./car.js";
import { camera_t } from "./camera.js";
import { draw3d_t } from "./draw3d.js";

function main()
{
  const draw = new draw_t(document.getElementById("display"));
  const input = new input_t(document.getElementById("display"));
  const camera = new camera_t();
  const draw3d = new draw3d_t(draw, camera);
  const map = new map_t("assets/scene.track");
  const car = new car_t();
  
  camera.set_fov(to_rad(60));
  
  camera.z_height = 7.0;
  camera.pos = new vec2_t(0, -5);
  
  let t = 0;

  setInterval(function() {
    car.reset_forces();
    
    if (input.get_key("W"))
      car.accel(50);
    if (input.get_key("S"))
      car.accel(-10);
    if (input.get_key("A"))
      car.steer(+0.4);
    if (input.get_key("D"))
      car.steer(-0.4);
    car.brake(input.get_key(" "));
    
    car.wheel_reset();
    car.wheel_forces();
    
    car.clip(map);
    car.integrate();
    
    camera.pos = vec2_t.sub(car.pos, vec2_t.mulf(car.dir, 7));
    camera.z_rot = Math.atan2(car.dir.x, car.dir.y);
    
    draw.clear();
    
    draw.begin();
    
    car.draw3d(draw3d);
    map.draw3d(draw3d);
    
    draw.stroke();
    
    t += 15 / 1000.0;
  }, 15);
}

main();
