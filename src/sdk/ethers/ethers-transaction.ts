import { ChainId } from '@earnkeeper/ekp-sdk';
import { ethers } from 'ethers';

export interface EthersTransaction
  extends Omit<
    ethers.providers.TransactionResponse,
    'chainId' | 'wait' | 'accessList' | 'r' | 's' | 'v'
  > {
  receipt?: ethers.providers.TransactionReceipt;
  chainId: ChainId;
}
