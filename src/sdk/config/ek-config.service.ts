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
import * as redisStore from 'cache-manager-redis-store';
import { RedisModuleAsyncOptions } from 'nestjs-redis';

@Injectable()
export class EkConfigService
  implements CacheOptionsFactory, SharedBullConfigurationFactory
{
  constructor(private configService: ConfigService) {
    this.pluginId = this.required('EKP_PLUGIN_ID');
    this.pluginName = this.required('EKP_PLUGIN_NAME');
    this.moralisServerUrl = this.optional('MORALIS_SERVER_URL');
    this.moralisAppId = this.optional('MORALIS_APP_ID');
    this.moralisMasterKey = this.optional('MORALIS_MASTER_KEY');
    this.redisHost = this.optional('REDIS_HOST', 'localhost');
    this.redisPort = Number(this.optional('REDIS_PORT', 6379));
    this.redisDb = Number(this.optional('REDIS_DB', 0));
    this.redisUser = this.optional('REDIS_USER', undefined);
    this.redisPassword = this.optional('REDIS_PASSWORD', undefined);
    this.openseaApiKey = this.optional('OPENSEA_API_KEY', undefined);
    this.sentryDsn = this.optional('SENTRY_DSN', undefined);
    this.environment = this.optional('NODE_ENV', 'production');
  }

  readonly pluginId: string;
  readonly pluginName: string;
  readonly environment: string;
  readonly moralisServerUrl: string;
  readonly moralisAppId: string;
  readonly moralisMasterKey: string;
  readonly redisHost: string;
  readonly redisPort: number;
  readonly redisDb: number;
  readonly redisUser: string;
  readonly redisPassword: string;
  readonly openseaApiKey: string;
  readonly sentryDsn: string;

  get sentryEnabled() {
    return !!this.sentryDsn;
  }

  static createRedisAsyncOptions(): RedisModuleAsyncOptions {
    return {
      useFactory: (configService: EkConfigService) => {
        return [
          {
            name: 'DEFAULT_CLIENT',
            host: configService.redisHost,
            port: configService.redisPort,
            keepAlive: 30000,
            username: configService.redisUser,
            password: configService.redisPassword,
            db: configService.redisDb,
          },
          {
            name: 'PUBLISH_CLIENT',
            host: configService.redisHost,
            port: configService.redisPort,
            keepAlive: 30000,
            username: configService.redisUser,
            password: configService.redisPassword,
            db: configService.redisDb,
          },
          {
            name: 'SUBSCRIBE_CLIENT',
            host: configService.redisHost,
            port: configService.redisPort,
            keepAlive: 30000,
            username: configService.redisUser,
            password: configService.redisPassword,
            db: configService.redisDb,
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
      username: this.redisUser,
      password: this.redisPassword,
      db: this.redisDb,
      ttl: 0,
    };
  }

  createSharedConfiguration(): BullModuleOptions {
    return {
      redis: {
        host: this.redisHost,
        port: this.redisPort,
        username: this.redisUser,
        password: this.redisPassword,
        db: this.redisDb,
      },
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
