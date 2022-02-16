import { Inject } from '@nestjs/common';
import retry from 'async-retry';
import Bottleneck from 'bottleneck';
import { ApmService } from '../apm/apm.service';
import { CacheService } from '../cache/cache.service';
import { EkConfigService } from '../config/ek-config.service';
import { LimiterService } from '../limiter.service';
import { logger } from '../util/default-logger';

export interface AbstractApiOptions {
  readonly name: string;
  readonly limit?: number | Bottleneck.ConstructorOptions;
}

export interface CallWrapperOptions {
  readonly url: string;
  readonly ttl?: number;
}

export class AbstractApiService {
  protected limiter: Bottleneck;
  @Inject()
  protected cacheService: CacheService;
  @Inject()
  protected limiterService: LimiterService;
  @Inject()
  protected configService: EkConfigService;
  @Inject()
  protected apmService: ApmService;

  constructor(private options: AbstractApiOptions) {}

  onModuleInit() {
    if (!!this.options?.limit) {
      this.limiter = this.createLimiter(this.options.name, this.options.limit);
    }
  }

  protected async handleCall<T>(
    options: CallWrapperOptions,
    call: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = `v1_${options.url}`;

    if (options.ttl !== undefined) {
      const cachedValue = await this.cacheService.get<T>(cacheKey);
      if (cachedValue !== null && cachedValue !== undefined) {
        return cachedValue;
      }
    }

    return retry<T>(
      async () => {
        const wrappedCall = async () => {
          logger.debug(`${options.url}`);

          const transaction = this.apmService.startTransaction({
            op: options.url,
            name: options.url,
          });

          const result = await call();

          if (options.ttl !== undefined) {
            await this.cacheService.set(cacheKey, result, {
              ttl: options.ttl,
            });
          }

          transaction?.finish();
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
    if (!!options.url) {
      logger.warn(`Retry due to ${error.message}: ${options?.url}`);

      // TODO: find a better way to log error objects rather than console.error
      if (error.isAxiosError) {
        console.error({
          request: error.request._header,
          response: {
            data: JSON.stringify(error.response?.data),
            headers: error.response?.headers,
            status: error.response?.status,
            statusText: error.response?.statusText,
          },
        });
      } else {
        console.error(error);
      }
      this.apmService.captureError(error);
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
