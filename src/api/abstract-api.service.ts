import { CACHE_MANAGER, Inject } from '@nestjs/common';
import retry from 'async-retry';
import Bottleneck from 'bottleneck';
import { Cache } from 'cache-manager';
import { logger } from '../util/default-logger';
import { EkConfigService } from '../config/ek-config.service';
import { LimiterService } from '../limiter.service';
import { AxiosError } from 'axios';
import _ from 'lodash';

export interface AbstractApiOptions {
  readonly name: string;
  readonly limit?: number | Bottleneck.ConstructorOptions;
}

export interface CallWrapperOptions {
  readonly cacheKey?: string;
  readonly logDetail?: string;
  readonly ttl?: number;
}

export class AbstractApiService {
  limiter: Bottleneck;
  @Inject(CACHE_MANAGER)
  private cache: Cache;
  @Inject()
  protected limiterService: LimiterService;
  @Inject()
  protected configService: EkConfigService;

  constructor(private options: AbstractApiOptions) {}

  onModuleInit() {
    if (!!this.options?.limit) {
      this.limiter = this.createLimiter(this.options.name, this.options.limit);
    }
  }

  protected async wrapCall<T>(
    call: () => Promise<T>,
    options?: CallWrapperOptions,
  ): Promise<T> {
    if (!!options.cacheKey) {
      const cachedValue = await this.cache.get<T>(options.cacheKey);
      if (cachedValue !== null) {
        return cachedValue;
      }
    }

    return retry<T>(
      async () => {
        const wrappedCall = async () => {
          if (!!options.logDetail) {
            logger.debug(`${options.logDetail}`);
          }

          const result = await call();

          if (!!options.cacheKey) {
            const cacheOptions = !!options.ttl
              ? { ttl: options.ttl }
              : undefined;

            await this.cache.set(options.cacheKey, result, cacheOptions);
          }
          return result;
        };

        if (!!this.limiter) {
          return this.limiter.schedule(wrappedCall);
        } else {
          return wrappedCall();
        }
      },
      {
        onRetry: (error) => this.handleRetryError(error, options),
      },
    );
  }

  protected handleRetryError(error: any, options: CallWrapperOptions) {
    if (!!options.logDetail) {
      logger.warn(`Retry due to ${error.message}: ${options?.logDetail}`);

      // TODO: find a better way to log error objects rather than console.error
      if (error.isAxiosError) {
        console.error({
          request: error.request._header,
          response: {
            data: error.response?.data,
            headers: error.response?.headers,
            status: error.response?.status,
            statusText: error.response?.statusText,
          },
        });
      } else {
        console.error(error);
      }
    }
  }

  protected createLimiter(
    id: string,
    options: number | Bottleneck.ConstructorOptions,
  ) {
    if (typeof options === 'number') {
      return new Bottleneck({
        maxConcurrent: options,
        reservoir: options,
        reservoirRefreshAmount: options,
        reservoirRefreshInterval: 1000,
        id,
        datastore: 'ioredis',
        clientOptions: {
          host: this.configService.redisHost,
          port: this.configService.redisPort,
        },
        clearDatastore: true,
      });
    } else {
      return new Bottleneck({
        ...options,
        id,
        datastore: 'ioredis',
        clientOptions: {
          host: this.configService.redisHost,
          port: this.configService.redisPort,
        },
        clearDatastore: true,
      });
    }
  }
}
