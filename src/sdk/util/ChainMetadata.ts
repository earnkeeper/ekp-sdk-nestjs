import { ChainId } from './ChainId';
import { TokenMetadata } from './TokenMetadata';

export interface ChainMetadata {
  readonly id: ChainId;
  readonly logo: string;
  readonly name: string;
  readonly explorer: string;
  readonly swap: string;
  readonly token: TokenMetadata;
}
