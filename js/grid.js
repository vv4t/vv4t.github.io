var canvas;

var width;
var height;

var ctx;

function init_canvas(_width, _height) {
	canvas = document.getElementById("retro_grid");

	canvas.width = _width;
	canvas.height = _height;

	width = Math.floor(canvas.width);
	height = Math.floor(canvas.height);

	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	
	ctx.fillStyle = "#ff00ff";
	ctx.strokeStyle = "#ff00ff";
}

function init_canvas2(_width, _height) {
	canvas = document.createElement("CANVAS");

	canvas.width = _width;
	canvas.height = _height;

	width = Math.floor(canvas.width);
	height = Math.floor(canvas.height);

	ctx = canvas.getContext("2d");
	ctx.imageSmoothingEnabled = false;
	
	ctx.fillStyle = "#ff00ff";
	ctx.strokeStyle = "#ff00ff";
}

var yheight = 3.0;
var zdepth = 40;

var zpos = 0.0;

function render_stars() {
	for (var i = 0; i < 50; i++) {
		var xpixel = Math.floor(Math.random() * width);
		var ypixel = Math.floor(Math.random() * height / 2);
		
		ctx.fillStyle = "#ffffff";
		ctx.fillRect(xpixel, ypixel, 2, 2);
		ctx.fillStyle = "#ff00ff";
	}
}

function render() {
	ctx.clearRect(0, height / 2, width, height);
	
	for (var z = 0; z < zdepth / 2.0 + 2; z++) {
		var ypixel = yheight / (z * 2.0 - zpos) * (height / 2.0) + height / 2.0;
		
		ctx.fillRect(0, Math.floor(ypixel), width, 1);
	}
	
	for (var x = -50; x < 50; x++) {
		var xpixel0 = (x * 2.0) / 1.0 * (height / 2.0) + width / 2.0;
		var xpixel1 = (x * 2.0) / zdepth * (height / 2.0) + width / 2.0;
		
		var ypixel0 = yheight / 1.0 * (height / 2.0) + height / 2.0;
		var ypixel1 = yheight / zdepth * (height / 2.0) + height / 2.0;
		
		ctx.beginPath();
			ctx.moveTo(xpixel1, ypixel1);
			ctx.lineTo(xpixel0, ypixel0);
		ctx.stroke();
	}
}