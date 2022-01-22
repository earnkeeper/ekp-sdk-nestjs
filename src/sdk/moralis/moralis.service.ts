import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import moment from 'moment';
import Moralis from 'moralis/node';
import { EkConfigService } from '../config/ek-config.service';
import { LimiterService } from '../limiter.service';
import { ChainId, chains, logger } from '../util';
import { TokenMetadata } from '../util/chain/models/TokenMetadata';
import {
  ChainList,
  ERC20Price,
  NativeBalance,
  NftContractMetadata,
  NftOwner,
  NftTransfer,
  TokenBalance,
  TokenTransfer,
  Transaction,
} from './types';

@Injectable()
export class MoralisService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    limiterService: LimiterService,
    private configService: EkConfigService,
  ) {
    this.limiter = limiterService.createLimiter('moralis-limiter', {
      minTime: 100,
    });
  }

  async onModuleInit() {
    await Moralis.start({
      serverUrl: this.configService.moralisServerUrl,
      appId: this.configService.moralisAppId,
    });
    logger.log('Moralis service initialized');
  }

  private limiter: Bottleneck;

  async latestTokenPriceOf(
    chainId: ChainId,
    tokenAddress: string,
  ): Promise<ERC20Price> {
    validate([chainId, tokenAddress], ['string', 'string']);

    const cacheKey = `moralis.latestTokenPriceOf_['${chainId}']['${tokenAddress}']`;
    const debugMessage = `Web3API > getTokenPrice('${chainId}', '${tokenAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            try {
              const start = moment().unix();

              const result = await Moralis.Web3API.token.getTokenPrice({
                chain: chainId,
                address: tokenAddress,
              });

              console.log(`request time: ${moment().unix() - start}`);

              return result;
            } catch (error) {
              if (error.code === 141) {
                return null;
              }

              throw error;
            }
          }),
          {
            onRetry: (error: any) => {
              console.error(error);

              return logger.warn(
                `Retry due to ${error.message}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 1800,
      },
    );
  }

  async nftTransfersOfTokenId(
    chainId: ChainId,
    tokenAddress: string,
    tokenId: string,
  ): Promise<NftTransfer[]> {
    validate([chainId, tokenAddress, tokenId], ['string', 'string', 'string']);

    const cacheKey = `moralis.nftTransfersOfTokenId['${chainId}']['${tokenAddress}'][${tokenId}]`;
    const debugMessage = `Web3API > getWalletTokenIdTransfers('${chainId}', '${tokenAddress}', ${tokenId})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response =
              await Moralis.Web3API.token.getWalletTokenIdTransfers({
                chain: chainId,
                address: tokenAddress,
                token_id: tokenId,
              });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({
              ...it,
              chain_id: chainId,
            }));
          }),
          {
            onRetry: (error) => {
              console.error(error);
              return logger.warn(
                `Retry due to ${error.message}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 5,
      },
    );
  }

  async tokenPriceOf(
    chainId: ChainId,
    tokenAddress: string,
    blockNumber: number,
  ): Promise<ERC20Price> {
    validate(
      [chainId, tokenAddress, blockNumber],
      ['string', 'string', 'number'],
    );

    const cacheKey = `moralis.tokenPriceOf['${chainId}']['${tokenAddress}'][${blockNumber}]`;
    const debugMessage = `Web3API > getTokenPrice('${chainId}', '${tokenAddress}', ${blockNumber})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            try {
              const result = await Moralis.Web3API.token.getTokenPrice({
                chain: chainId,
                address: tokenAddress,
                to_block: blockNumber,
              });

              return result;
            } catch (error) {
              if (error.code === 141) {
                return null;
              }

              throw error;
            }
          }),
          {
            onRetry: (error) => {
              console.error(error);
              return logger.warn(
                `Retry due to ${error.message}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 0,
      },
    );
  }

  async tokenMetadataOf(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<TokenMetadata> {
    validate([chainId, contractAddress], ['string', 'string']);

    const cacheKey = `moralis.tokenMetadataOf__['${chainId}']['${contractAddress}']`;
    const debugMessage = `Web3API > getTokenMetadata('${chainId}', '${contractAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const result = await Moralis.Web3API.token.getTokenMetadata({
              addresses: [contractAddress],
              chain: chainId,
            });

            if (!Array.isArray(result) || result.length === 0) {
              return undefined;
            }

            return <TokenMetadata>{
              ...result[0],
              decimals: Number(result[0].decimals),
              chainId,
            };
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 0,
      },
    );
  }

  async nativeBalanceOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<string> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nativeBalance_['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNativeBalance('${chainId}', '${ownerAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const result: NativeBalance =
              await Moralis.Web3API.account.getNativeBalance({
                address: ownerAddress,
                chain: chainId,
              });

            return result?.balance;
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 60,
      },
    );
  }

  async tokensOf(
    chainId: ChainList,
    ownerAddress: string,
    includeNativeBalance = true,
  ): Promise<TokenBalance[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.tokensByOwner_['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getTokenBalances('${chainId}', '${ownerAddress}')`;

    const tokens: TokenBalance[] = await this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response = await Moralis.Web3API.account.getTokenBalances({
              address: ownerAddress,
              chain: chainId,
            });

            return response?.map(
              (token) =>
                <TokenBalance>{
                  ...token,
                  chain_id: chainId,
                },
            );
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 60,
      },
    );

    if (includeNativeBalance) {
      const nativeBalance = await this.nativeBalanceOf(chainId, ownerAddress);

      const chainMetadata = chains[chainId];

      if (!chainMetadata) {
        throw new Error(`Sorry ${chainId} not ready yet, file an issue!`);
      }

      tokens.push(<TokenBalance>{
        balance: nativeBalance,
        chain_id: chainId,
        decimals: chainMetadata.token.decimals.toString(),
        logo: chainMetadata.logo,
        name: chainMetadata.token.name,
        symbol: chainMetadata.token.symbol,
        thumbnail: chainMetadata.logo,
        token_address: chainMetadata.token.address,
      });
    }

    return tokens;
  }

  async nftsOf(chainId: ChainList, ownerAddress: string): Promise<NftOwner[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftsByOwner_['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTs('${chainId}', '${ownerAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response = await Moralis.Web3API.account.getNFTs({
              address: ownerAddress,
              chain: chainId,
            });

            return response?.result
              ?.filter((it) => !['OPENSTORE'].includes(it.symbol))
              .map((nft) => ({
                ...nft,
                chain_id: chainId,
              }));
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 60,
      },
    );
  }

  async nftMetadataOf(
    chainId: ChainList,
    contractAddress: string,
  ): Promise<NftContractMetadata> {
    validate([chainId, contractAddress], ['string', 'string']);

    const cacheKey = `moralis.metadata_['${chainId}']['${contractAddress}']`;

    const debugMessage = `Web3API > getNFTMetadata('${chainId}', '${contractAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const nftMetadata = await Moralis.Web3API.token.getNFTMetadata({
              address: contractAddress,
              chain: chainId,
            });

            return <NftContractMetadata>{
              ...nftMetadata,
              chain_id: chainId,
            };
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      { ttl: 3600 },
    );
  }

  async tokenTransfersOf(
    chainId: ChainList,
    ownerAddress: string,
    offset = 0,
  ): Promise<TokenTransfer[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const cacheKey = `moralis.transfersOf_['${chainId}']['${ownerAddress}'][${offset}]`;
    const debugMessage = `Web3API > getTokenTransfers('${chainId}', '${ownerAddress}', ${offset})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response = await Moralis.Web3API.account.getTokenTransfers({
              address: ownerAddress,
              chain: chainId,
              offset,
            });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 300,
      },
    );
  }

  async allTransactionsOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<Transaction[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const transactions = [];

    const cacheKey = `moralis.allTransactionsOf_['${chainId}']['${ownerAddress}']`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        while (true) {
          const nextTransactions = await this.transactionsOf(
            chainId,
            ownerAddress,
            transactions.length,
          );

          if (nextTransactions.length === 0) {
            break;
          }

          transactions.push(
            ...nextTransactions.map((it) => ({ ...it, chain_id: chainId })),
          );
        }

        return transactions;
      },
      {
        ttl: 300,
      },
    );
  }

  async allTokenTransfersOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<TokenTransfer[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const transfers = [];

    const cacheKey = `moralis.allTokenTransfersOf_['${chainId}']['${ownerAddress}']`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        while (true) {
          const nextTransfers = await this.tokenTransfersOf(
            chainId,
            ownerAddress,
            transfers.length,
          );

          if (nextTransfers.length === 0) {
            break;
          }

          transfers.push(...nextTransfers);
        }

        return transfers;
      },
      {
        ttl: 300,
      },
    );
  }

  async transactionsOf(
    chainId: ChainList,
    ownerAddress: string,
    offset = 0,
  ): Promise<Transaction[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const cacheKey = `moralis.transactionsOf_['${chainId}']['${ownerAddress}'][${offset}]`;
    const debugMessage = `Web3API > getTransactions('${chainId}', '${ownerAddress}', ${offset})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response = await Moralis.Web3API.account.getTransactions({
              address: ownerAddress,
              chain: chainId,
              offset,
            });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 3600,
      },
    );
  }

  async nftContractTransfersOf(
    chainId: ChainList,
    contractAddress: string,
    limit = 500,
  ): Promise<NftTransfer[]> {
    validate([chainId, contractAddress, limit], ['string', 'string', 'number']);

    const cacheKey = `moralis.nftContractTransfersOf__['${chainId}']['${contractAddress}'][${limit}]`;
    const debugMessage = `Web3API > getContractNFTTransfers('${chainId}', '${contractAddress}', ${limit})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response =
              await Moralis.Web3API.token.getContractNFTTransfers({
                address: contractAddress,
                chain: chainId,
                limit,
              });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 1800,
      },
    );
  }

  async nftTransfersOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<NftTransfer[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftTransfersOf__['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTTransfers('${chainId}', '${ownerAddress}'`;

    // // TODO: once moralis has fixed ERC20 contracts appearing in the NFT list, can remove this
    const bannedContracts = ['0xe9e7cea3dedca5984780bafc599bd69add087d56'];

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.log(this.limiter.counts());

            const response = await Moralis.Web3API.account.getNFTTransfers({
              address: ownerAddress,
              chain: chainId,
            });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result
              .filter((it) => !bannedContracts.includes(it.token_address))
              .map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 300,
      },
    );
  }
}
