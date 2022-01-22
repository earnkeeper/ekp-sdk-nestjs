import { ethers } from 'ethers';

export function safeBigNumberFrom(value: ethers.BigNumberish) {
  if (value === undefined) {
    return undefined;
  }

  return ethers.BigNumber.from(value);
}
