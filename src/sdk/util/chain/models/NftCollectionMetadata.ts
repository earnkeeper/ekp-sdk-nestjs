import { ChainId } from '../ChainId';

export interface NftCollectionMetadata {
  readonly chainId: ChainId;
  readonly contractAddress: string;
  readonly logo: string;
  readonly name: string;
  readonly slug?: string;
  readonly symbol: string;
}
