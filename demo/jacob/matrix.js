
export class matrix_t {
  constructor(row, col)
  {
    this.row = row;
    this.col = col;
    this.m = new Float64Array(row * col);
  }
  
  get(i, j)
  {
    if (i >= this.row || j >= this.col) {
      console.error(`could not get M[${i}][${j}] in ${this.row}x${this.col} matrix`);
    }
    
    return this.m[i * this.col + j];
  }
  
  set(i, j, k)
  {
    if (i >= this.row || j >= this.col) {
      console.error(`could not set M[${i}][${j}] in ${this.row}x${this.col} matrix`);
    }
    
    this.m[i * this.col + j] = k;
  }
  
  mul(M)
  {
    if (this.col != M.row) {
      console.error(`cannot multiply M_${this.row}x${this.col} and M_${M.row}x${M.col$}`);
    }
    
    const res = new matrix_t(this.row, M.col);
    
    for (let i = 0; i < res.row; i++) {
      for (let j = 0; j < res.col; j++) {
        let m_ij = 0;
        
        for (let k = 0; k < this.col; k++) {
          m_ij += this.get(i, k) * M.get(k, j);
        }
        
        res.set(i, j, m_ij);
      }
    }
    
    return res;
  }
  
  mulf(f)
  {
    const res = new matrix_t(this.row, this.col);
    
    for (let i = 0; i < res.row; i++) {
      for (let j = 0; j < res.col; j++) {
        res.set(i, j, this.get(i,j) * f);
      }
    }
    
    return res;
  }
  
  add(M)
  {
    if (this.row !== M.row || this.col !== M.col) {
      console.error(`cannot add M_${this.row}x${this.col} and M_${M.row}x${M.col}`);
    }
    
    const res = new matrix_t(this.row, this.col);
    
    for (let i = 0; i < this.row; i++) {
      for (let j = 0; j < this.col; j++) {
        res.set(i, j, this.get(i,j) + M.get(i,j));
      }
    }
    
    return res;
  }
  
  transpose()
  {
    const res = new matrix_t(this.col, this.row);
    
    for (let i = 0; i < this.col; i++) {
      for (let j = 0; j < this.row; j++) {
        res.set(i, j, this.get(j,i));
      }
    }
    
    return res;
  }
  
  copy()
  {
    const M = new matrix_t(this.row, this.col);
    M.m = this.m.slice();
    return M;
  }
  
  inverse()
  {
    if (this.row !== this.col) {
      console.error("cannot inverse non-square");
    }
    
    const order = this.row;
    
    const aug = new matrix_t(order, 2*order);
    
    for (let i = 0; i < order; i++) {
      for (let j = 0; j < order; j++) {
        if (i == j) {
          aug.set(i,order+j,1);
        } else {
          aug.set(i,order+j,0);
        }
        
        aug.set(i,j, this.get(i,j));
      }
    }
    
    for (let i = this.row - 1; i >= 0; i--) {
      if (aug.get(i-1,0) < aug.get(i,0)) {
        aug.swap(i-1, i);
      }
    }
    
    for (let i = 0; i < order; i++) {
      for (let j = 0; j < order; j++) {
        if (j != i) {
          const tmp = aug.get(j,i) / aug.get(i,i);
          for (let k = 0; k < 2 * order; k++) {
            aug.set(j,k, aug.get(j,k) - aug.get(i,k) * tmp);
          }
        }
      }
    }
    
    for (let i = 0; i < order; i++) {
      const tmp = aug.get(i,i);
      for (let j = 0; j < 2 * order; j++) {
        aug.set(i,j, aug.get(i,j) / tmp);
      }
    }
    
    const M_inv = new matrix_t(order, order);
    
    for (let i = 0; i < order; i++) {
      for (let j = 0; j < order; j++) {
        M_inv.set(i,j, aug.get(i,j+order));
      }
    }
    
    return M_inv;
  }
  
  swap(i,j)
  {
    for (let k = 0; k < this.col; k++) {
      const tmp = this.get(i,k);
      this.set(i,k, this.get(j,k));
      this.set(j,k, tmp);
    }
  }
  
  print()
  {
    let string = `matrix<${this.row}, ${this.col}> {\n`;
    
    for (let i = 0; i < this.row; i++) {
      for (let j = 0; j < this.col; j++) {
        string += " " + this.get(i,j).toFixed(3);
      }
      string += "\n";
    }
    
    string += "}";
    
    console.log(string);
  }
};

export function matrix_from(arr)
{
  const res = new matrix_t(arr.length, arr[0].length);
  
  for (let i = 0; i < res.row; i++) {
    for (let j = 0; j < res.col; j++) {
      res.set(i, j, arr[i][j]);
    }
  }
  
  return res;
}
