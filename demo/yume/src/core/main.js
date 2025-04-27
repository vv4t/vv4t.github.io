"use strict"

import { map_t } from "./map.js";
import { game_t } from "./game.js";
import { input_t, input_axis } from "./input.js";
import { bus_t } from "./bus.js";
import { load_assets } from "./assets.js";
import { renderer_t } from "../renderer/renderer.js";

function run() {
  const input = new input_t();
  const bus = new bus_t();
  const game = new game_t(bus, input);
  const renderer = new renderer_t(game);

  input.bind_key_to_axis("w", input_axis.UP);
  input.bind_key_to_axis("s", input_axis.DOWN);
  input.bind_key_to_axis("a", input_axis.LEFT);
  input.bind_key_to_axis("d", input_axis.RIGHT);

  bus.raise_events(["load_map_desert"]);

  let tick = 0;

  function update() {
    if (tick++ % 2 === 0) {
      process_bus();
      game.update();
      renderer.render();
    }
    requestAnimationFrame(update);
  }

  function process_bus() {
    const events = bus.read_events();

    for (const bus_event of events) {
      if (bus_event.startsWith("load_map_")) do_load_map(bus_event);
      if (bus_event == "play_desert") game.play_desert_cutscene();
      if (bus_event == "play_final_chamber") game.play_final_chamber_cutscene();
      if (bus_event == "play_language") game.play_language_cutscene();
      if (bus_event == "play_human") game.play_human_cutscene();
      if (bus_event == "play_elevator") game.play_elevator_cutscene();
    }
  }

  function do_load_map(bus_event) {
    const name = bus_event.substring("load_map_".length);
    const map = new map_t(name);
    game.load_map(map);
    renderer.load_map(map);
  }

  requestAnimationFrame(update);
}

load_assets().then(() => run());

