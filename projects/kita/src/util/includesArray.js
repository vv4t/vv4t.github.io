export function includesArray (data, arr) {
  return data.some(e => Array.isArray(e) && e.every((o, i) => Object.is(arr[i], o)));
}