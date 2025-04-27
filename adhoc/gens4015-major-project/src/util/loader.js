"use strict";

export class loader_t {
  constructor() {}
  
  async load_file(path) {
    const result = await fetch(path);
    if (result.ok) {
      return result.text();
    }
    return null;
  }
  
  async load_json(path) {
    const result = await fetch(path);
    if (result.ok) {
      return result.json();
    }
    return null;
  }
  
  async load_image(path) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject();
      image.src = path;
    });
  }
};
