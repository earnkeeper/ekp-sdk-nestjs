import {
  BullModuleOptions,
  SharedBullConfigurationFactory,
} from '@nestjs/bull';
import {
  CacheModuleOptions,
  CacheOptionsFactory,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MongooseModuleOptions,
  MongooseOptionsFactory,
} from '@nestjs/mongoose';
import * as redisStore from 'cache-manager-redis-store';
import { RedisModuleAsyncOptions } from 'nestjs-redis';

@Injectable()
export class EkConfigService
  implements
    CacheOptionsFactory,
    MongooseOptionsFactory,
    SharedBullConfigurationFactory
{
  constructor(private configService: ConfigService) {
    this.pluginId = this.required('EKP_PLUGIN_ID');
    this.pluginName = this.required('EKP_PLUGIN_NAME');
    this.moralisServerUrl = this.required('MORALIS_SERVER_URL');
    this.moralisAppId = this.required('MORALIS_APP_ID');
    this.mongoHost = this.optional('MONGO_HOST');
    this.redisHost = this.optional('REDIS_HOST');
    this.mongoPort = this.optional('MONGO_PORT', 27017);
    this.redisPort = this.optional('REDIS_PORT', 6379);
    this.mongoUser = this.optional('MONGO_USER', undefined);
    this.mongoPassword = this.optional('MONGO_PASSWORD', undefined);
    this.mongoDatabaseName = this.optional(
      'MONGO_DB_NAME',
      `ekp-${this.pluginId}`,
    );
    this.redisUser = this.optional('REDIS_USER', undefined);
    this.redisPassword = this.optional('REDIS_PASSWORD', undefined);
    this.openseaApiKey = this.optional('OPENSEA_API_KEY', undefined);
  }

  readonly pluginId: string;
  readonly pluginName: string;
  readonly moralisServerUrl: string;
  readonly moralisAppId: string;
  readonly mongoHost: string;
  readonly mongoPort: number;
  readonly mongoUser: string;
  readonly mongoPassword: string;
  readonly mongoDatabaseName: string;
  readonly redisHost: string;
  readonly redisPort: number;
  readonly redisUser: string;
  readonly redisPassword: string;
  readonly openseaApiKey: string;

  static createRedisAsyncOptions(): RedisModuleAsyncOptions {
    return {
      useFactory: (configService: EkConfigService) => {
        return [
          {
            name: 'PUBLISH_CLIENT',
            host: configService.redisHost,
            port: configService.redisPort,
          },
          {
            name: 'SUBSCRIBE_CLIENT',
            host: configService.redisHost,
            port: configService.redisPort,
          },
        ];
      },
      inject: [EkConfigService],
    };
  }
  createCacheOptions(): CacheModuleOptions {
    return {
      isGlobal: true,
      store: redisStore,
      host: this.redisHost,
      port: this.redisPort,
      ttl: 0,
    };
  }

  createMongooseOptions(): MongooseModuleOptions {
    return {
      uri: `mongodb://${this.mongoHost}:${this.mongoPort}/${this.mongoDatabaseName}`,
    };
  }

  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: {
        host: this.redisHost,
        port: this.redisPort,
      },
      prefix: 'v1_',
    };
  }

  private required<T>(name: string): T {
    const value = this.configService.get(name);
    if (value === undefined || value === null) {
      console.error(`Environment variable ${name} is required and missing`);
      throw new Error(`Environment variable ${name} is required and missing`);
    }
    return value;
  }

  private optional<T>(name: string, defaultValue?: T): T {
    const value = this.configService.get(name);
    if (value === undefined || value === null) {
      return defaultValue;
    }
    return value;
  }
}
