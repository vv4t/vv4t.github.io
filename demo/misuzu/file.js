"use strict";

export function file_load(path, on_load)
{
  const xhttp = new XMLHttpRequest();
  xhttp.onload = function(e) {
    on_load(xhttp.responseText);
  };
  xhttp.open("GET", path);
  xhttp.send();
}
