"use strict";

import { loader_t } from "../util/loader.js";

const files = [
  [ "assets/shaders/world.vert", "text" ],
  [ "assets/shaders/world.frag", "text" ],
  [ "assets/tilesets/sprites.png", "image" ],
  [ "assets/tilesets/walkway.png", "image" ],
  [ "assets/tilesets/desert.png", "image" ],
  [ "assets/tilesets/stairs.png", "image" ],
  [ "assets/tilesets/finalchamber.png", "image" ],
  [ "assets/tilesets/largechamber.png", "image" ],
  [ "assets/maps/walkway.tmj", "json" ],
  [ "assets/maps/desert.tmj", "json" ],
  [ "assets/maps/stairs.tmj", "json" ],
  [ "assets/maps/after_elevator.tmj", "json" ],
  [ "assets/maps/largechamber.tmj", "json" ],
  [ "assets/maps/finalchamber.tmj", "json" ],
  [ "assets/data/LOG1.txt", "text" ],
  [ "assets/data/LOG2.txt", "text" ],
  [ "assets/data/LOG3.txt", "text" ],
  [ "assets/data/SWARM.txt", "text" ],
  [ "assets/data/MACHINER.txt", "text" ],
  [ "assets/data/HUMAN.txt", "text" ],
];

const asset_library = {};

export async function load_assets() {
  const loader = new loader_t();
  const loading = [];
  
  for (const file of files) {
    const [path, type] = file;
    switch (type) {
    case "text":
      loading.push(loader.load_file(path));
      break;
    case "json":
      loading.push(loader.load_json(path));
      break;
    case "image":
      loading.push(loader.load_image(path));
      break;
    }
  }
  
  const assets = await Promise.all(loading);
  
  for (let i = 0; i < files.length; i++) {
    const [path, type] = files[i];
    asset_library[path] = assets[i];
  }
}

export function get_asset(path) {
  return asset_library[path];
}
