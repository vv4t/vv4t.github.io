const canvas = document.getElementById("retro_grid");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

ctx.fillStyle = "#ffffff";
ctx.strokeStyle = "#ffffff";

var z_pos = 0.0;

const stars = [];

for (let i = 0; i < 50; i++) {
  stars.push({
		x: Math.floor(Math.random() * canvas.width),
		y: Math.floor(Math.random() * canvas.height / 2)
  });
}

let mouse_x = 0;
let mouse_y = 0;

document.addEventListener("mousemove", function(e) {
  mouse_x = e.clientX;
  mouse_y = e.clientY;
});

function y_height(x, y)
{
  const m_x = (mouse_x - canvas.scrollWidth / 2) / canvas.scrollWidth * 32;
  const m_y = (mouse_y - canvas.scrollHeight / 2) / canvas.scrollHeight * 10;
  
  const p_x = x - m_x;
  const p_y = y - (15 - m_y  + z_pos);
  
  const sink = -9 * Math.pow(Math.E, -1/2 * (p_x * p_x + p_y * p_y));
  const wave = (Math.sin(0.5 * x - z_pos * 0.2) - Math.cos(0.2 * y - z_pos * 0.05));
  
  return wave + sink + 3;
}

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (const star of stars)
    ctx.fillRect(star.x, star.y, 2, 2);
	
  let fov = canvas.scrollHeight;
  
  ctx.beginPath();
  for (let z = Math.floor(z_pos); z < z_pos + 50; z++) {
    const THICK = Math.floor(z - z_pos) + 10;
    for (let x = -THICK; x < THICK; x++) {
      const y0 = y_height(x, z);
      const y1 = y_height(x + 1, z);
      const y2 = y_height(x + 1, z + 1);
      
      const z_cam = z - z_pos;
      
      if (z_cam < 0)
        continue;
      
      const xp0 = x / z_cam * fov + canvas.width / 2;
      const xp1 = (x + 1) / z_cam * fov + canvas.width / 2;
      const xp2 = (x + 1) / (z_cam + 1) * fov + canvas.width / 2;
      
      const yp0 = y0 / z_cam * fov + canvas.height / 2;
      const yp1 = y1 / z_cam * fov + canvas.height / 2;
      const yp2 = y2 / (z_cam + 1) * fov + canvas.height / 2;
      
      // scuffed boundary
      if (x > -THICK) {
        if (z + 1 > z_pos + 50) {
          ctx.moveTo(xp0, yp0);
          ctx.lineTo(xp1, yp1);
        } else {
          ctx.moveTo(xp0, yp0);
          ctx.lineTo(xp1, yp1);
          ctx.lineTo(xp2, yp2);
        }
      } else {
        ctx.moveTo(xp1, yp1);
        ctx.lineTo(xp2, yp2);
      }
    }
  }
  ctx.stroke();
}

function animate()
{
  z_pos += 0.1;
  render();
  requestAnimationFrame(animate);
}

animate();
