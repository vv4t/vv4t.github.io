export function fileLoad(path, onLoad)
{
  const xhttp= new XMLHttpRequest();
  xhttp.onload = function(e) {
    onLoad(xhttp.responseText);
  };
  xhttp.open("GET", path);
  xhttp.send();
}
