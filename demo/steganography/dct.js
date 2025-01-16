
const N = 4;
const dctBuffer = new Float32Array(N);
const e = (i) => i == 0 ? 1 / Math.sqrt(N) : Math.sqrt(2/N);

function dct(A) {
  for (let k = 0; k < N; k++) {
    let X_k = 0;
    
    for (let n = 0; n < N; n++) {
      X_k += A[n] * e(k) * Math.cos(Math.PI/N * (n + 1/2) * k);
    }
    
    dctBuffer[k] = X_k;
  }
  
  for (let i = 0; i < N; i++) {
    A[i] = dctBuffer[i];
  }
}

function idct(A) {
  for (let k = 0; k < N; k++) {
    let X_k = 0;
    
    for (let n = 0; n < N; n++) {
      X_k += A[n] * e(n) * Math.cos(Math.PI/N * (k + 1/2) * n);
    }
    
    dctBuffer[k] = X_k;
  }
  
  for (let i = 0; i < N; i++) {
    A[i] = dctBuffer[i];
  }
}

export function dctApply(dctSquare) {
  const vector = new Float32Array(4);

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) vector[j] = dctSquare[i * 4 + j];
    dct(vector);
    for (let j = 0; j < 4; j++) dctSquare[i * 4 + j] = vector[j];
  }
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) vector[j] = dctSquare[j * 4 + i];
    dct(vector);
    for (let j = 0; j < 4; j++) dctSquare[j * 4 + i] = vector[j];
  }
}

export function idctApply(dctSquare) {
  const vector = new Float32Array(4);
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) vector[j] = dctSquare[j * 4 + i];
    dct(vector);
    for (let j = 0; j < 4; j++) dctSquare[j * 4 + i] = vector[j];
  }
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) vector[j] = dctSquare[i * 4 + j];
    dct(vector);
    for (let j = 0; j < 4; j++) dctSquare[i * 4 + j] = vector[j];
  }
}

