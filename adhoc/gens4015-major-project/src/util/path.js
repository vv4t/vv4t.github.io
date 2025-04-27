"use strict"

export function path_simplify(path) {
  const parts = path.split("/");
  const new_path = [];

  for (const part of parts) {
    switch (part) {
    case ".":
      break;
    case "..":
      new_path.pop();
      break;
    default:
      new_path.push(part);
      break;
    }
  }

  return path_join(new_path);
}

export function path_join(parts) {
  return parts.join("/");
}
