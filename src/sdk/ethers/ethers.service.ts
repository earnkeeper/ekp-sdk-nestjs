import { bignumber } from '@earnkeeper/ekp-sdk';
import { Injectable } from '@nestjs/common';
import retry from 'async-retry';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import { CacheService } from '../cache/cache.service';
import { LimiterService } from '../limiter.service';
import { logger } from '../util';
import { EthersTransaction } from './ethers-transaction';

@Injectable()
export class EthersService {
  constructor(
    private cacheService: CacheService,
    private limiterService: LimiterService,
  ) {}

  private providers = {
    bsc: {
      provider: new ethers.providers.JsonRpcProvider(
        'https://bsc-dataseed.binance.org',
      ),
      limiter: this.limiterService.createLimiter('bsc-provider', {
        minTime: 100,
      }),
    },
    eth: {
      provider: new ethers.providers.JsonRpcProvider(
        'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      ),
      limiter: this.limiterService.createLimiter('eth-provider', {
        minTime: 50,
      }),
    },
    polygon: {
      provider: new ethers.providers.JsonRpcProvider(
        'https://rpc-mainnet.maticvigil.com/',
      ),
      limiter: this.limiterService.createLimiter('polygon-provider', {
        minTime: 100,
      }),
    },
  };

  getProvider(chainId: string): ethers.providers.Provider {
    return this.providers[chainId]?.provider;
  }

  async send(
    chainId: string,
    to: string,
    data: string | number | string[],
    abiOutput?: string[],
  ) {
    validate([chainId, to, data], ['string', 'string', 'string|number|Array']);

    const limiter = this.providers[chainId].limiter;
    const provider = this.providers[chainId]
      ?.provider as ethers.providers.JsonRpcProvider;

    const debugKey = `Sending data to ${to}`;

    return retry(
      async () => {
        return limiter.schedule(async () => {
          logger.debug(debugKey);
          const response = await provider.send('eth_call', [
            { to, data },
            'latest',
          ]);

          if (!!abiOutput) {
            return new ethers.utils.AbiCoder().decode(abiOutput, response);
          }

          return response;
        });
      },
      {
        onRetry: (error) => {
          logger.warn(`Retry due to ${error.message}: ${debugKey}`);
          console.error(error);
        },
      },
    );
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

    const result: EthersTransaction = await this.cacheService.wrap(
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
      gasLimit: bignumber.safeFrom(result.gasLimit),
      gasPrice: bignumber.safeFrom(result.gasPrice),
      maxPriorityFeePerGas: bignumber.safeFrom(result.maxPriorityFeePerGas),
      maxFeePerGas: bignumber.safeFrom(result.maxFeePerGas),
      value: bignumber.safeFrom(result.value),
      receipt: {
        ...result.receipt,
        cumulativeGasUsed: bignumber.safeFrom(result.receipt.cumulativeGasUsed),
        effectiveGasPrice: bignumber.safeFrom(result.receipt.effectiveGasPrice),
        gasUsed: bignumber.safeFrom(result.receipt.gasUsed),
      },
    };
  }
}
