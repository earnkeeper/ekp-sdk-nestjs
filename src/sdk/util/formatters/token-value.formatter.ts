import { commify } from '@ethersproject/units';

export function tokenValue(value: number) {
  if (isNaN(value)) {
    return '?';
  }

  if (value === 0) {
    return '0';
  }

  if (value < 0.0001) {
    return '~0';
  }

  // TODO: find a better way to implement significant figures
  // I tried a couple of libraries and toPrecision() but they didn't work very well

  if (value < 1) {
    return value.toFixed(4);
  }

  if (value < 10) {
    return value.toFixed(3);
  }

  if (value < 100) {
    return value.toFixed(2);
  }

  if (value < 1000) {
    return value.toFixed(1);
  }

  return commify(Math.floor(value));
}
