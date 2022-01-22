import { components } from 'moralis/types/generated/web3Api';
import { ChainId } from '../util/chain/ChainId';

export type ChainList = components['schemas']['chainList'];
export type ERC20Price = components['schemas']['erc20Price'] & {
  chain_id: string;
  token_address: string;
};
export type NativeBalance = components['schemas']['nativeBalance'];
export type NftContractMetadata =
  components['schemas']['nftContractMetadata'] & { chain_id: string };
export type NftOwner = components['schemas']['nftOwner'] & { chain_id: string };
export type NftOwnerCollection = components['schemas']['nftOwnerCollection'];
export type NftTransfer = components['schemas']['nftTransfer'] & {
  chain_id: string;
};
export type TokenBalance = components['schemas']['erc20TokenBalance'] & {
  chain_id: ChainId;
};
export type Transaction = components['schemas']['transaction'] & {
  chain_id: ChainId;
};
export type TransactionCollection =
  components['schemas']['transactionCollection'];
export type TokenTransfer = components['schemas']['erc20Transaction'] & {
  chain_id: ChainId;
};
