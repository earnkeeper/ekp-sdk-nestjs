import { components } from 'moralis/types/generated/web3Api';
import { ChainId } from '../../util';

export type ChainListDto = components['schemas']['chainList'];

export type ERC20PriceDto = components['schemas']['erc20Price'] & {
  chain_id: ChainId;
  token_address: string;
  block_number: string;
};

export type NativeBalanceDto = components['schemas']['nativeBalance'];

export type NftContractMetadataDto =
  components['schemas']['nftContractMetadata'] & { chain_id: string };

export type NftOwnerDto = components['schemas']['nftOwner'] & {
  chain_id: ChainId;
};

export type NftOwnerCollectionDto = components['schemas']['nftOwnerCollection'];

export type NftTransferDto = components['schemas']['nftTransfer'] & {
  chain_id: ChainId;
};
export type TokenBalanceDto = components['schemas']['erc20TokenBalance'] & {
  chain_id: ChainId;
};
export type TransactionDto = components['schemas']['transaction'] & {
  chain_id: string;
};
export type TransactionCollectionDto =
  components['schemas']['transactionCollection'];

export type TokenTransferDto = components['schemas']['erc20Transaction'] & {
  chain_id: string;
};
