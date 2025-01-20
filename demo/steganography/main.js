"use strict";

import * as rs from "./reedSolomon.js";
import { dctApply, idctApply } from "./dct.js";
import { dwtApply, idwtApply } from "./dwt.js";
import { cyrb128, sfc32 } from "./rand.js";

function RS(messageLength, errorCorrectionLength) {
	var dataLength = messageLength - errorCorrectionLength;
	var encoder = new rs.ReedSolomonEncoder(rs.GenericGF.AZTEC_DATA_8());
	var decoder = new rs.ReedSolomonDecoder(rs.GenericGF.AZTEC_DATA_8());
	return {
		dataLength: dataLength,
		messageLength: messageLength,
		errorCorrectionLength: errorCorrectionLength,

		encode : function (message) {
			encoder.encode(message, errorCorrectionLength);
		},

		decode: function (message) {
			decoder.decode(message, errorCorrectionLength);
		}
	};
}

const info = document.getElementById("info");
const target = document.getElementById("target");
const preview = document.getElementById("preview");
const ouptut = document.getElementById("output");
const text = document.getElementById("text");
const imageUpload = document.getElementById("source");
const buffer = document.getElementById("buffer");
const display = document.getElementById("display");
const textCount = document.getElementById("count");
const gain = document.getElementById("gain");
const seed = document.getElementById("seed");
const ctx = buffer.getContext("2d");

const mainSize = 512;
const ec = RS(32, 16);
const maxLength = Math.pow(mainSize / 2 / 4, 2) / 8;
const contentLength = Math.floor(maxLength * ec.dataLength / ec.messageLength);

text.maxLength = contentLength;
textCount.innerHTML = `${text.value.length}/${contentLength}`;

function encodeImage(image) {
  const message = text.value;
  const binaryString = convertBinary(message);
  
  const [ size, width, height ] = getPo2Size(image.width, image.height);
  
  buffer.width = width;
  buffer.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  
  const imageData = ctx.getImageData(0, 0, size, size);
  const dataArray = new Float32Array(size * size);
  convertYCbCr(imageData, dataArray);
  recursiveEncode(dataArray, size, mainSize, binaryString);
  convertRGB(imageData, dataArray);
  ctx.putImageData(imageData, 0, 0);
  
  // output.innerHTML = "Binary Encoding: " + binaryString;
  
  display.src = buffer.toDataURL();
}

function recursiveEncode(dataArray, currentSize, desiredSize, binaryString) {
  if (currentSize != desiredSize) {
    const [ LL, LH, HL, HH ] = dwtApply(dataArray, currentSize);
    recursiveEncode(LL, currentSize / 2, desiredSize, binaryString);
    idwtApply(dataArray, currentSize, LL, LH, HL, HH);
  } else {
    const [ LL, LH, HL, HH ] = dwtApply(dataArray, currentSize);
    imageEncode(HH, currentSize / 2, binaryString);
    idwtApply(dataArray, currentSize, LL, LH, HL, HH);
  }
}

function decodeImage(image) {
  const [ size, width, height ] = getPo2Size(image.width, image.height);
  
  buffer.width = width;
  buffer.height = height;
  ctx.drawImage(image, 0, 0, width, height);
  
  const imageData = ctx.getImageData(0, 0, size, size);
  const dataArray = new Float32Array(size * size);
  convertYCbCr(imageData, dataArray);
  const decodedMessage = recursiveDecode(dataArray, size, mainSize);
  const binaryString = decodedMessage.join("");
  const asciiString = convertASCII(binaryString);
  
  output.innerText = "Decoded ASCII: " + asciiString;
  // output.innerHTML += "<br>";
  // output.innerHTML += "Binary Decoding: " + binaryString;
}

function recursiveDecode(dataArray, currentSize, desiredSize) {
  if (currentSize != desiredSize) {
    const [ LL, LH, HL, HH ] = dwtApply(dataArray, currentSize);
    return recursiveDecode(LL, currentSize / 2, desiredSize);
  } else {
    const [ LL, LH, HL, HH ] = dwtApply(dataArray, currentSize);
    return imageDecode(HH, currentSize / 2);
  }
}

function convertBinary(asciiString) {
  const contentArray = new Uint8Array(contentLength);
  const bufferArray = new Uint8Array(ec.messageLength);
  const intArray = new Uint8Array(maxLength);
  
  for (let i = 0; i < Math.min(contentArray.length, asciiString.length); i++) {
    contentArray[i] = asciiString[i].charCodeAt(0);
  }
  
  for (let i = 0; i < maxLength / ec.messageLength; i++) {
    for (let j = 0; j < ec.dataLength; j++) {
      bufferArray[j] = contentArray[i * ec.dataLength + j];
    }
    
    ec.encode(bufferArray);
    
    for (let j = 0; j < ec.messageLength; j++) {
      intArray[i * ec.messageLength + j] = bufferArray[j];
    }
  }
  
  return Array.from(intArray).map((n) => n.toString(2).padStart(8, 0)).join("");
}

function convertASCII(binaryString) {
  const bufferArray = new Uint8Array(ec.messageLength);
  const intArray = new Uint8Array(maxLength);
  let offset = 0;
  
  while (binaryString.length > 0) {
    const block = binaryString.substring(0, 8);
    intArray[offset++] = parseInt(block, 2);
    binaryString = binaryString.substring(8);
  }
  
  let res = "";
  
  for (let i = 0; i < maxLength; i += ec.messageLength) {
    for (let j = 0; j < ec.messageLength; j++) {
      bufferArray[j] = intArray[i + j];
    }
    
    try {
      ec.decode(bufferArray);
    } catch (e) {
      console.log("failed to correct", i);
    }
    
    for (let j = 0; j < ec.dataLength; j++) {
      res += String.fromCharCode(bufferArray[j]);
    }
  }
  
  return res;
}

function convertYCbCr(imageData, dataArray) {
  for (let i = 0; i < dataArray.length; i++) {
    const R = imageData.data[i * 4 + 0];
    const G = imageData.data[i * 4 + 1]
    const B = imageData.data[i * 4 + 2];
    dataArray[i] = 0.299 * R + 0.587 * G + 0.114 * B;
  }
}

function convertRGB(imageData, dataArray) {
  for (let i = 0; i < dataArray.length; i++) {
    const R = imageData.data[i * 4 + 0];
    const G = imageData.data[i * 4 + 1]
    const B = imageData.data[i * 4 + 2];
    
    const Y = dataArray[i];
    const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
    const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
    
    const nR = Y + 1.402 * (Cr - 128);
    const nG = Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128);
    const nB = Y + 1.772 * (Cb - 128);
    
    imageData.data[i * 4 + 0] = Math.round(nR);
    imageData.data[i * 4 + 1] = Math.round(nG);
    imageData.data[i * 4 + 2] = Math.round(nB);
  }
}

function imageEncode(dataArray, size, binaryString) {
  const S_0 = cyrb128(seed.value + "1");
  const S_1 = cyrb128(seed.value + "2");

  const P_0 = sfc32(S_0[0], S_0[1], S_0[2], S_0[3]);
  const P_1 = sfc32(S_1[0], S_1[1], S_1[2], S_1[3]);
  
  let offset = 0;
  
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const noiseVectorSelect = {
        "0": nextNoiseVector(P_0),
        "1": nextNoiseVector(P_1)
      };
      
      const bit = binaryString[offset++];
      
      dctEncode(dataArray, size, x, y, noiseVectorSelect[bit]);
    }
  }
}

function imageDecode(dataArray, size) {
  const S_0 = cyrb128(seed.value + "1");
  const S_1 = cyrb128(seed.value + "2");

  const P_0 = sfc32(S_0[0], S_0[1], S_0[2], S_0[3]);
  const P_1 = sfc32(S_1[0], S_1[1], S_1[2], S_1[3]);
  
  const bitArray = [];
  
  for (let y = 0; y < size; y += 4) {
    for (let x = 0; x < size; x += 4) {
      const noiseVector0 = nextNoiseVector(P_0);
      const noiseVector1 = nextNoiseVector(P_1);
      
      const bit = dctDecode(dataArray, size, x, y, noiseVector0, noiseVector1);
      bitArray.push(bit);
    }
  }
  
  return bitArray;
}

function dctDecode(dataArray, size, x, y, noiseVector0, noiseVector1) {
  const dctSquare = new Float32Array(4 * 4);
  readData(dctSquare, size, dataArray, x, y);
  dctApply(dctSquare);
  
  const dataVector = readDataVector(dctSquare);
  
  const r0 = pearsonCorrelation(dataVector, noiseVector0);
  const r1 = pearsonCorrelation(dataVector, noiseVector1);
  
  return r0 < r1 ? 1 : 0;
}

function readDataVector(dataArray) {
  const dataVector = new Float32Array(10);
  
  let N = 0;
  
  for (let i = 2; i < 4; i++) {
    for (let j = 0; j < i + 1; j++) {
      const x = i - j;
      const y = j;
      dataVector[N] = dataArray[y * 4 + x];
      N++;
    }
  }

  for (let j = 0; j < 3; j++) {
    const x = 3 - j;
    const y = 1 + j;
    dataVector[N] = dataArray[y * 4 + x];
    N++;
  }
  
  return dataVector;
}

function noiseApply(outputArray, noiseVector) {
  let N = 0;
  
  for (let i = 2; i < 4; i++) {
    for (let j = 0; j < i + 1; j++) {
      const x = i - j;
      const y = j;
      outputArray[y * 4 + x] += noiseVector[N++];
    }
  }
  
  for (let j = 0; j < 3; j++) {
    const x = 3 - j;
    const y = 1 + j;
    outputArray[y * 4 + x] += noiseVector[N++];
  }
}

function pearsonCorrelation(X, Y) {
  const N = X.length;
  
  let x_bar = 0.0;
  let y_bar = 0.0;
  
  for (let i = 0; i < N; i++) {
    x_bar += X[i];
    y_bar += Y[i];
  }
  
  x_bar /= N;
  y_bar /= N;
  
  let sumDiffProd = 0.0;
  let sumSquareDiffX = 0.0;
  let sumSquareDiffY = 0.0;
  
  for (let i = 0; i < N; i++) {
    sumDiffProd += (X[i] - x_bar) * (Y[i] - y_bar);
    sumSquareDiffX += Math.pow(X[i] - x_bar, 2);
    sumSquareDiffY += Math.pow(Y[i] - y_bar, 2);
  }
  
  return sumDiffProd / Math.sqrt(sumSquareDiffX * sumSquareDiffY);
}

function nextNoiseVector(noise) {
  const noiseVector = new Float32Array(10);
  for (let i = 0; i < noiseVector.length; i++) {
    noiseVector[i] = (noise() * 2.0 - 1.0) * gain.value;
  }
  return noiseVector;
}

function dctEncode(dataArray, size, x, y, noiseVector) {
  const dctSquare = new Float32Array(4 * 4);
  readData(dctSquare, size, dataArray, x, y);
  
  dctApply(dctSquare);
  noiseApply(dctSquare, noiseVector);
  idctApply(dctSquare);
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      dataArray[(y + i) * size + (x + j)] = dctSquare[i * 4 + j];
    }
  }
}

function readData(outputArray, size, dataArray, x, y) {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      outputArray[i * 4 + j] = dataArray[(y + i) * size + (x + j)];
    }
  }
}

function getPo2Size(width, height) {
  if (height < width) {
    const size = Math.max(Math.pow(2, Math.round(Math.log(height)/Math.log(2))), mainSize);
    return [ size, Math.round(size * width / height), size ];
  } else {
    const size = Math.max(Math.pow(2, Math.round(Math.log(width)/Math.log(2))), mainSize);
    return [ size, size, Math.round(size * height / width) ];
  }
}

function changeTarget(src) {
  target.src = src;
  target.onload = () => {
    info.innerHTML = `${target.width}x${target.height}`;

    // Modified to retain aspect ratio of image while remaining in the bounds of the parent div
    // Good for large images, or images which weird aspect ratios. Downsides are lossless quality on preview
    // Possibly could be fixed by changing canvas filtering / .width .height attributes on canvas element itself?
    // - dceit.

    const newWidth = target.width;
    const newHeight = target.height;

    const parentWidth = preview.parentElement.offsetWidth;
    const parentHeight = preview.parentElement.offsetHeight;

    const aspectRatio = newWidth / newHeight;

    let displayWidth, displayHeight;

    if (newWidth > parentWidth || newHeight > parentHeight) {
      if (parentWidth / aspectRatio <= parentHeight) {
        displayWidth = parentWidth;
        displayHeight = parentWidth / aspectRatio;
      } else {
        displayHeight = parentHeight;
        displayWidth = parentHeight * aspectRatio;
      }
    } else {
      displayWidth = newWidth;
      displayHeight = newHeight;
    }

    const previewWidthPercentage = (displayWidth / parentWidth) * 100;
    const previewHeightPercentage = (displayHeight / parentHeight) * 100;

    preview.style.width = `${Math.min(previewWidthPercentage, 100)}%`;
    preview.style.height = `${Math.min(previewHeightPercentage, 100)}%`;
    
    const ctx = preview.getContext("2d");
    preview.height = 512;
    ctx.clearRect(0, 0, preview.width, preview.height); // Clear the canvas
    ctx.drawImage(target, 0, 0, preview.width, preview.height);
  };
}



imageUpload.addEventListener("change", (e) => {
  changeTarget(window.URL.createObjectURL(imageUpload.files[0]));
});

text.addEventListener("keyup", () => {
  textCount.innerHTML = `${text.value.length}/${contentLength}`;
});

document.getElementById("encode").addEventListener("click", () => {
  encodeImage(target);
});

document.getElementById("decode").addEventListener("click", () => {
  decodeImage(target);
});

document.getElementById("save").addEventListener("click", () => {
  window.open(display.src, "_blank");
});

window.addEventListener("paste", (e) => {
  const data = (e || e.originalEvent).clipboardData;
  const blob = Array.from(data.items).find((item) => item.type.startsWith("image")).getAsFile();
  if (blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      changeTarget(e.target.result);
    };
    reader.readAsDataURL(blob);
  }
});

const drop = document.getElementById("drop");

drop.addEventListener("drop", (e) => {
  e.preventDefault();
  const data = e.dataTransfer;
  const blob = Array.from(data.items).find((item) => item.type.startsWith("image")).getAsFile();
  if (blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      changeTarget(e.target.result);
    };
    reader.readAsDataURL(blob);
  }
});

drop.addEventListener("dragover", (e) => {
  e.preventDefault();
});
