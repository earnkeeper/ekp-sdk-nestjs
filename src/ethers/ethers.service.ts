import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import { ethers } from 'ethers';
import _ from 'lodash';
import { LimiterService } from '../limiter.service';
import { logger, safeBigNumberFrom } from '../util';
import { EthersTransaction } from './ethers-transaction';

@Injectable()
export class EthersService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    private limiterService: LimiterService,
  ) {}

  private providers = {
    bsc: {
      provider: new ethers.providers.JsonRpcProvider(
        'https://bsc-dataseed.binance.org',
      ),
      limiter: this.limiterService.createLimiter('bsc-provider', 10),
    },
    eth: {
      provider: new ethers.providers.JsonRpcProvider(
        'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      ),
      limiter: this.limiterService.createLimiter('eth-provider', 30),
    },
    polygon: {
      provider: new ethers.providers.JsonRpcProvider(
        'https://rpc-mainnet.maticvigil.com/',
      ),
      limiter: this.limiterService.createLimiter('polygon-provider', 10),
    },
  };

  getProvider(chainId: string): ethers.providers.Provider {
    return this.providers[chainId]?.provider;
  }

  async wrapProviderCall<T>(
    chainId: string,
    call: (provider: ethers.providers.Provider) => Promise<T>,
  ) {
    validate([chainId, call], ['string', 'function']);

    const limiter = this.providers[chainId].limiter;

    const provider: ethers.providers.Provider =
      this.providers[chainId]?.provider;

    return await limiter.schedule(async () => {
      return await call(provider);
    });
  }

  async transactionReceiptOf(
    chainId: string,
    transactionHash: string,
  ): Promise<EthersTransaction> {
    validate([chainId, transactionHash], ['string', 'string']);

    const cacheKey = `ethers.transactionReceiptOf_['${chainId}']['${transactionHash}']`;
    const debugMessage = `ethers.provider.getTransactionReceipt('${chainId}', '${transactionHash}')`;

    const provider: ethers.providers.Provider =
      this.providers[chainId]?.provider;

    validate(provider, 'object');

    const limiter = this.providers[chainId].limiter;

    const result: EthersTransaction = await this.cache.wrap(
      cacheKey,
      () =>
        retry(
          limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await provider.getTransaction(transactionHash);

            if (!response) {
              return undefined;
            }

            const receipt = await provider.getTransactionReceipt(
              transactionHash,
            );

            if (!receipt) {
              return undefined;
            }

            return <EthersTransaction>{
              ...response,
              chainId,
              receipt,
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

    // TODO: is there a better way to solve the deserialization error that forced this?
    return {
      ...result,
      gasLimit: safeBigNumberFrom(result.gasLimit),
      gasPrice: safeBigNumberFrom(result.gasPrice),
      maxPriorityFeePerGas: safeBigNumberFrom(result.maxPriorityFeePerGas),
      maxFeePerGas: safeBigNumberFrom(result.maxFeePerGas),
      value: safeBigNumberFrom(result.value),
      receipt: {
        ...result.receipt,
        cumulativeGasUsed: safeBigNumberFrom(result.receipt.cumulativeGasUsed),
        effectiveGasPrice: safeBigNumberFrom(result.receipt.effectiveGasPrice),
        gasUsed: safeBigNumberFrom(result.receipt.gasUsed),
      },
    };
  }
}
