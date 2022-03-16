import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { RedisService } from 'nestjs-redis';
import { LockOptions, Mutex } from 'redis-semaphore';
import { EkConfigService } from './config/ek-config.service';

@Injectable()
export class LimiterService {
  constructor(
    private configService: EkConfigService,
    private redisService: RedisService,
  ) {}

  createMutex(id: string, options?: LockOptions) {
    const redisClient = this.redisService.getClient('DEFAULT_CLIENT');
    return new Mutex(redisClient, id, options);
  }

  createLimiter(id: string, options: number | Bottleneck.ConstructorOptions) {
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
          username: this.configService.redisUser,
          password: this.configService.redisPassword,
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
          username: this.configService.redisUser,
          password: this.configService.redisPassword,
        },
        clearDatastore: true,
      });
    }
  }
}
