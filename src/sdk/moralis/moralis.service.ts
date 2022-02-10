import { Injectable } from '@nestjs/common';
import { validate } from 'bycontract';
import Moralis from 'moralis/node';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';
import { AbstractApiService } from '../api/abstract-api.service';
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
  TradeDto,
  TransactionDto,
} from './dto';

const BASE_URL = 'https://deep-index.moralis.io/api/v2';

@Injectable()
export class MoralisService extends AbstractApiService {
  private _ready = new BehaviorSubject<boolean>(false);

  get ready() {
    return this._ready.value;
  }

  waitForReady(): Promise<boolean> {
    return firstValueFrom(this._ready.pipe(filter((it) => it)));
  }

  constructor() {
    super({
      name: MoralisService.name,
      limit: {
        minTime: 100,
        maxConcurrent: 20,
      },
    });
  }

  async onModuleInit() {
    try {
      this._ready.next(false);
      await Moralis.start({
        serverUrl: this.configService.moralisServerUrl,
        appId: this.configService.moralisAppId,
        masterKey: this.configService.moralisMasterKey,
      });

      logger.log('Moralis service initialized');

      this._ready.next(true);
    } catch (error) {
      this.sentryService.captureError(error);
      throw error;
    }
  }

  async lowestPriceOfNft(
    chainId: ChainId,
    contractAddress: string,
    days: number,
  ): Promise<TradeDto> {
    const url = `${BASE_URL}/nft/${contractAddress}/lowestprice?chain=${chainId}&days=${days}`;

    return this.handleCall(
      {
        url,
        ttl: 1800,
      },
      async () => {
        try {
          const result = await Moralis.Web3API.token.getNFTLowestPrice({
            chain: chainId,
            days,
            address: contractAddress,
          });

          return {
            ...result,
            chain_id: chainId,
          };
        } catch (error) {
          if (error.message === 'Could not get NFT lower Price') {
            return undefined;
          }
          throw error;
        }
      },
    );
  }

  async latestTokenPriceOf(
    chainId: ChainId,
    tokenAddress: string,
  ): Promise<ERC20PriceDto> {
    validate([chainId, tokenAddress], ['string', 'string']);

    const url = `${BASE_URL}/erc20/${tokenAddress}/price?chain=${chainId}`;

    return this.handleCall(
      {
        url,
        ttl: 1800,
      },
      async () => {
        try {
          const result = await Moralis.Web3API.token.getTokenPrice({
            chain: chainId,
            address: tokenAddress,
          });

          return {
            ...result,
            chain_id: chainId,
            token_address: tokenAddress,
            block_number: undefined,
          };
        } catch (error) {
          if (
            error.code === 141 ||
            error.message?.includes('No pools found with enough liquidity')
          ) {
            return undefined;
          }
          throw error;
        }
      },
    );
  }

  async nftTransfersOfTokenId(
    chainId: ChainId,
    tokenAddress: string,
    tokenId: string,
  ): Promise<NftTransferDto[]> {
    validate([chainId, tokenAddress, tokenId], ['string', 'string', 'string']);

    const url = `${BASE_URL}/nft/${tokenAddress}${tokenId}/transfers?chain=${chainId}`;

    return this.handleCall(
      {
        url,
        ttl: 300,
      },
      async () => {
        const response = await Moralis.Web3API.token.getWalletTokenIdTransfers({
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
      },
    );
  }

  async tokenPriceOf(
    chainId: ChainId,
    tokenAddress: string,
    blockNumber: number,
  ): Promise<ERC20PriceDto> {
    validate(
      [chainId, tokenAddress, blockNumber],
      ['string', 'string', 'number='],
    );

    const url = `${BASE_URL}/erc20/${tokenAddress}/price?chain=${chainId}&to_block=${blockNumber}`;

    return this.handleCall({ url, ttl: 0 }, async () => {
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
        if (
          error.code === 141 ||
          error.message?.includes('No pools found with enough liquidity')
        ) {
          return undefined;
        }

        throw error;
      }
    });
  }

  async tokenMetadataOf(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<TokenMetadata> {
    validate([chainId, contractAddress], ['string', 'string']);

    const url = `${BASE_URL}/erc20/metadata?chain=${chainId}&addresses=${contractAddress}`;

    return this.handleCall({ url, ttl: 0 }, async () => {
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
    });
  }

  async nativeBalanceOf(
    chainId: ChainListDto,
    ownerAddress: string,
  ): Promise<string> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const url = `${BASE_URL}/${ownerAddress}/balance?chain=${chainId}`;

    return this.handleCall({ url, ttl: 60 }, async () => {
      const result: NativeBalanceDto =
        await Moralis.Web3API.account.getNativeBalance({
          address: ownerAddress,
          chain: chainId,
        });

      return result?.balance;
    });
  }

  async tokensOf(
    chainId: ChainListDto,
    ownerAddress: string,
    includeNativeBalance = true,
  ): Promise<TokenBalanceDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const url = `${BASE_URL}/${ownerAddress}/erc20?chain=${chainId}`;

    const tokens: TokenBalanceDto[] = await this.handleCall(
      { url, ttl: 60 },
      async () => {
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

    const url = `${BASE_URL}/${ownerAddress}/nft?chain=${chainId}`;

    return this.handleCall({ url, ttl: 60 }, async () => {
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
    });
  }

  async nftMetadataOf(
    chainId: ChainListDto,
    contractAddress: string,
  ): Promise<NftContractMetadataDto> {
    validate([chainId, contractAddress], ['string', 'string']);

    const url = `${BASE_URL}/nft/${contractAddress}/metadata?chain=${chainId}`;

    return this.handleCall({ url, ttl: 3600 }, async () => {
      const nftMetadata = await Moralis.Web3API.token.getNFTMetadata({
        address: contractAddress,
        chain: chainId,
      });

      return <NftContractMetadataDto>{
        ...nftMetadata,
        chain_id: chainId,
      };
    });
  }

  async fetchTokenTransfers(
    chainId: ChainListDto,
    ownerAddress: string,
    fromBlock = 0,
    offset = 0,
    limit = 500,
  ): Promise<TokenTransferDto[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const url = `${BASE_URL}/${ownerAddress}/erc20/transfers?chain=${chainId}&fromBlock=${fromBlock}&offset=${offset}&limit=${limit}`;

    return this.handleCall({ url }, async () => {
      const response = await Moralis.Web3API.account.getTokenTransfers({
        address: ownerAddress,
        chain: chainId,
        from_block: fromBlock,
        offset,
        limit,
      });

      if (!Array.isArray(response?.result)) {
        return [];
      }

      return response.result.map((it) => ({ ...it, chain_id: chainId }));
    });
  }
  async fetchContractTokenTransfers(
    chainId: ChainListDto,
    contractAddress: string,
    fromBlock = 0,
    offset = 0,
    limit = 500,
  ): Promise<TokenTransferDto[]> {
    validate(
      [chainId, contractAddress, offset],
      ['string', 'string', 'number'],
    );

    const url = `${BASE_URL}/erc20/${contractAddress}/transfers?chain=${chainId}&fromBlock=${fromBlock}&offset=${offset}&limit=${limit}`;

    return this.handleCall({ url }, async () => {
      const response = await Moralis.Web3API.token.getTokenAddressTransfers({
        address: contractAddress,
        chain: chainId,
        from_block: fromBlock,
        offset,
        limit,
      });

      if (!Array.isArray(response?.result)) {
        return [];
      }

      return response.result.map((it) => ({ ...it, chain_id: chainId }));
    });
  }
  async allTokenTransfersOf(
    chainId: ChainListDto,
    ownerAddress: string,
  ): Promise<TokenTransferDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const url = `${BASE_URL}/${ownerAddress}/erc20/transfers?chain=${chainId}`;

    return this.handleCall({ url, ttl: 300 }, async () => {
      const transfers = [];

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
    });
  }

  async fetchTransactions(
    chainId: ChainListDto,
    ownerAddress: string,
    fromBlock = 0,
    offset = 0,
    limit = 500,
  ): Promise<TransactionDto[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const url = `${BASE_URL}/${ownerAddress}?chain=${chainId}&fromBlock=${fromBlock}&offset=${offset}&limit=${limit}`;

    return this.handleCall({ url }, async () => {
      const response = await Moralis.Web3API.account.getTransactions({
        address: ownerAddress,
        chain: chainId,
        from_block: fromBlock,
        offset,
        limit,
      });

      if (!Array.isArray(response?.result)) {
        return [];
      }

      return response.result.map((it) => ({ ...it, chain_id: chainId }));
    });
  }

  async nftContractTransfersOf(
    chainId: ChainId,
    contractAddress: string,
    limit = 500,
  ): Promise<NftTransferDto[]> {
    validate([chainId, contractAddress, limit], ['string', 'string', 'number']);

    const url = `${BASE_URL}/nft/${contractAddress}/transfers?chain=${chainId}&limit=${limit}`;

    return this.handleCall({ url, ttl: 1800 }, async () => {
      const response = await Moralis.Web3API.token.getContractNFTTransfers({
        address: contractAddress,
        chain: chainId,
        limit,
      });

      if (!Array.isArray(response?.result)) {
        return [];
      }

      return response.result.map((it) => ({ ...it, chain_id: chainId }));
    });
  }

  async nftTransfersOf(
    chainId: ChainId,
    ownerAddress: string,
  ): Promise<NftTransferDto[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const url = `${BASE_URL}/${ownerAddress}/nft/transfers?chain=${chainId}`;

    return this.handleCall({ url, ttl: 300 }, async () => {
      // TODO: once moralis has fixed ERC20 contracts appearing in the NFT list, can remove this
      const bannedContracts = ['0xe9e7cea3dedca5984780bafc599bd69add087d56'];
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
    });
  }
}
