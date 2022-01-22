import { Injectable } from '@nestjs/common';
import Bottleneck from 'bottleneck';
import { EkConfigService } from './config/ek-config.service';

@Injectable()
export class LimiterService {
  constructor(private configService: EkConfigService) {}

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
