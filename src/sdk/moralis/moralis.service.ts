import { Injectable } from '@nestjs/common';
import retry from 'async-retry';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import moment from 'moment';
import Moralis from 'moralis/node';
import { CacheService } from '../cache/cache.service';
import { EkConfigService } from '../config/ek-config.service';
import { LimiterService } from '../limiter.service';
import { ChainId, chains, logger } from '../util';
import { TokenMetadata } from '../util/chain/models/TokenMetadata';
import {
  ChainListDto,
  ERC20PriceDto,
  NativeBalanceDto,
  NftContractMetadataDto,
  NftOwnerDto,
  NftTransferDto,
  TokenBalanceDto,
  TokenTransferDto,
  TransactionDto,
} from './dto';

@Injectable()
export class MoralisService {
  constructor(
    private cacheService: CacheService,
    limiterService: LimiterService,
    private configService: EkConfigService,
  ) {
    this.limiter = limiterService.createLimiter('moralis-limiter', {
      minTime: 100,
      maxConcurrent: 20,
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
  ): Promise<ERC20PriceDto> {
    validate([chainId, tokenAddress], ['string', 'string']);

    const cacheKey = `v3_moralis.latestTokenPriceOf['${chainId}']['${tokenAddress}']`;
    const debugMessage = `Web3API > getTokenPrice('${chainId}', '${tokenAddress}')`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

            try {
              const start = moment().unix();

              const result = await Moralis.Web3API.token.getTokenPrice({
                chain: chainId,
                address: tokenAddress,
              });

              console.debug(`request time: ${moment().unix() - start}`);

              return {
                ...result,
                chain_id: chainId,
                token_address: tokenAddress,
                block_number: undefined,
              };
            } catch (error) {
              if (error.code === 141) {
                return undefined;
              }
              console.error(error);
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
  ): Promise<NftTransferDto[]> {
    validate([chainId, tokenAddress, tokenId], ['string', 'string', 'string']);

    const cacheKey = `moralis.nftTransfersOfTokenId['${chainId}']['${tokenAddress}'][${tokenId}]`;
    const debugMessage = `Web3API > getWalletTokenIdTransfers('${chainId}', '${tokenAddress}', ${tokenId})`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

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
    blockNumber?: number,
  ): Promise<ERC20PriceDto> {
    validate(
      [chainId, tokenAddress, blockNumber],
      ['string', 'string', 'number='],
    );

    const cacheKey = `v3_moralis.tokenPriceOf['${chainId}']['${tokenAddress}'][${blockNumber}]`;
    const debugMessage = `Web3API > getTokenPrice('${chainId}', '${tokenAddress}', ${blockNumber})`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

            try {
              const result = await Moralis.Web3API.token.getTokenPrice({
                chain: chainId,
                address: tokenAddress,
                to_block: blockNumber,
              });

              const erc20Price = {
                ...result,
                chain_id: chainId,
                token_address: tokenAddress,
                block_number: blockNumber,
              };

              return erc20Price;
            } catch (error) {
              if (error.code === 141) {
                return undefined;
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
        ttl: !!blockNumber ? 0 : 3600,
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

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

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
    chainId: ChainListDto,
    ownerAddress: string,
  ): Promise<string> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nativeBalance_['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNativeBalance('${chainId}', '${ownerAddress}')`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

            const result: NativeBalanceDto =
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
    chainId: ChainListDto,
    ownerAddress: string,
    includeNativeBalance = true,
  ): Promise<TokenBalanceDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.tokensByOwner_['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getTokenBalances('${chainId}', '${ownerAddress}')`;

    const tokens: TokenBalanceDto[] = await this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

            const response = await Moralis.Web3API.account.getTokenBalances({
              address: ownerAddress,
              chain: chainId,
            });

            return response?.map(
              (token) =>
                <TokenBalanceDto>{
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

      tokens.push(<TokenBalanceDto>{
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

  async nftsOf(chainId: ChainId, ownerAddress: string): Promise<NftOwnerDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftsByOwner_['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTs('${chainId}', '${ownerAddress}')`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

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
    chainId: ChainListDto,
    contractAddress: string,
  ): Promise<NftContractMetadataDto> {
    validate([chainId, contractAddress], ['string', 'string']);

    const cacheKey = `moralis.metadata_['${chainId}']['${contractAddress}']`;

    const debugMessage = `Web3API > getNFTMetadata('${chainId}', '${contractAddress}')`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

            const nftMetadata = await Moralis.Web3API.token.getNFTMetadata({
              address: contractAddress,
              chain: chainId,
            });

            return <NftContractMetadataDto>{
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

  async fetchTokenTransfers(
    chainId: ChainListDto,
    ownerAddress: string,
    blockNumber = 0,
    offset = 0,
    limit = 500,
  ): Promise<TokenTransferDto[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const debugMessage = `Web3API > getTokenTransfers('${chainId}', '${ownerAddress}', ${blockNumber}, ${offset}, ${limit})`;

    return retry(
      this.limiter.wrap(async () => {
        logger.debug(debugMessage);
        console.debug(this.limiter.counts());

        const response = await Moralis.Web3API.account.getTokenTransfers({
          address: ownerAddress,
          chain: chainId,
          from_block: blockNumber,
          offset,
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
    );
  }

  async allTokenTransfersOf(
    chainId: ChainListDto,
    ownerAddress: string,
  ): Promise<TokenTransferDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const transfers = [];

    const cacheKey = `moralis.allTokenTransfersOf_['${chainId}']['${ownerAddress}']`;

    return this.cacheService.wrap(
      cacheKey,
      async () => {
        while (true) {
          const nextTransfers = await this.fetchTokenTransfers(
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

  async fetchTransactions(
    chainId: ChainListDto,
    ownerAddress: string,
    blockNumber = 0,
    offset = 0,
    limit = 500,
  ): Promise<TransactionDto[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const debugMessage = `Web3API > getTransactions('${chainId}', '${ownerAddress}', ${blockNumber}, ${offset}, ${limit})`;

    return retry(
      this.limiter.wrap(async () => {
        logger.debug(debugMessage);
        console.debug(this.limiter.counts());

        const response = await Moralis.Web3API.account.getTransactions({
          address: ownerAddress,
          chain: chainId,
          from_block: blockNumber,
          offset,
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
    );
  }

  async nftContractTransfersOf(
    chainId: ChainId,
    contractAddress: string,
    limit = 500,
  ): Promise<NftTransferDto[]> {
    validate([chainId, contractAddress, limit], ['string', 'string', 'number']);

    const cacheKey = `moralis.nftContractTransfersOf__['${chainId}']['${contractAddress}'][${limit}]`;
    const debugMessage = `Web3API > getContractNFTTransfers('${chainId}', '${contractAddress}', ${limit})`;

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

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
    chainId: ChainId,
    ownerAddress: string,
  ): Promise<NftTransferDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftTransfersOf__['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTTransfers('${chainId}', '${ownerAddress}'`;

    // // TODO: once moralis has fixed ERC20 contracts appearing in the NFT list, can remove this
    const bannedContracts = ['0xe9e7cea3dedca5984780bafc599bd69add087d56'];

    return this.cacheService.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);
            console.debug(this.limiter.counts());

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
