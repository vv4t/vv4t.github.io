import { spriteMapLoad } from "./gfx/spriteMap.js";

export async function assetsLoad(onLoaded)
{
  const assets = {
    "font": await new Promise((resolve) => {
      spriteMapLoad("font", (font) => resolve(font));
    }),
    "entities": await new Promise((resolve) => {
      spriteMapLoad("entities", (entitySpriteMap) => resolve(entitySpriteMap));
    }),
    "hud": await new Promise((resolve) => {
      spriteMapLoad("hud", (hudSpriteMap) => resolve(hudSpriteMap));
    })
  };
  
  onLoaded(assets);
}
