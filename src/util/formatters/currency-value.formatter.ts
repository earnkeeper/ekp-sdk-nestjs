import { commify } from '@ethersproject/units';

export function currencyValue(value: number, symbol: string) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (isNaN(value)) {
    return `?`;
  }

  if (value === 0) {
    return `${symbol} 0`;
  }

  if (value > 0 && value < 0.0001) {
    return `${symbol} ~0`;
  }

  const negative = value < 0;

  const absValue = Math.abs(value);

  // TODO: find a better way to implement significant figures
  // I tried a couple of libraries and toPrecision() but they didn't work very well

  let c: string;

  if (absValue < 1) {
    c = absValue.toFixed(2);
  } else if (absValue < 10) {
    c = absValue.toFixed(2);
  } else if (absValue < 100) {
    c = absValue.toFixed(1);
  } else if (absValue < 1000) {
    c = absValue.toFixed(0);
  } else {
    c = commify(Math.floor(absValue));
  }

  return `${negative ? '- ' : ''} ${symbol} ${c}`;
}
