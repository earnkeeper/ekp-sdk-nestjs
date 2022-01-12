import { ethers } from 'ethers';
import { ChainId } from '../util';

export interface EthersTransaction
  extends Omit<
    ethers.providers.TransactionResponse,
    'chainId' | 'wait' | 'accessList' | 'r' | 's' | 'v'
  > {
  receipt?: ethers.providers.TransactionReceipt;
  chainId: ChainId;
}
