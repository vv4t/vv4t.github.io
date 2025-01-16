
export function dwtApply(dataArray, size) {
  const halfSize = size / 2;
  
  const LL = new Float32Array(halfSize * halfSize);
  const LH = new Float32Array(halfSize * halfSize);
  const HL = new Float32Array(halfSize * halfSize);
  const HH = new Float32Array(halfSize * halfSize);
  
  for (let i = 0; i < halfSize; i++) {
    for (let j = 0; j < halfSize; j ++) {
      const a = dataArray[(i * 2 + 0) * size + (j * 2 + 0)];
      const b = dataArray[(i * 2 + 0) * size + (j * 2 + 1)];
      const c = dataArray[(i * 2 + 1) * size + (j * 2 + 0)];
      const d = dataArray[(i * 2 + 1) * size + (j * 2 + 1)];
      
      LL[i * halfSize + j] = (a+b+c+d) / 4;
      LH[i * halfSize + j] = (b+d-a-c) / 4;
      HL[i * halfSize + j] = (c+d-a-b) / 4;
      HH[i * halfSize + j] = (b+c-a-d) / 4;
    }
  }
  
  return [ LL, LH, HL, HH ];
}

export function idwtApply(dataArray, size, LL, LH, HL, HH) {
  const halfSize = size / 2;
  
  for (let i = 0; i < halfSize; i++) {
    for (let j = 0; j < halfSize; j++) {
      const LL_ij = LL[i * halfSize + j];
      const LH_ij = LH[i * halfSize + j];
      const HL_ij = HL[i * halfSize + j];
      const HH_ij = HH[i * halfSize + j];
      
      const a = LL_ij - LH_ij - HL_ij - HH_ij;
      const b = LL_ij + LH_ij - HL_ij + HH_ij;
      const c = LL_ij - LH_ij + HL_ij + HH_ij;
      const d = LL_ij + LH_ij + HL_ij - HH_ij;
      
      dataArray[(i * 2 + 0) * size + (j * 2 + 0)] = a;
      dataArray[(i * 2 + 0) * size + (j * 2 + 1)] = b;
      dataArray[(i * 2 + 1) * size + (j * 2 + 0)] = c;
      dataArray[(i * 2 + 1) * size + (j * 2 + 1)] = d;
    }
  }
}

