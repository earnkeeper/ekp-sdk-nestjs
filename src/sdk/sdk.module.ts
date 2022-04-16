import { BullModule } from '@nestjs/bull';
import { CacheModule, Global, Module } from '@nestjs/common';
import { RedisModule } from 'nestjs-redis';
import { ApmService } from './apm/apm.service';
import { CacheService } from './cache/cache.service';
import { CoingeckoService } from './coingecko/coingecko.service';
import { EkConfigModule } from './config/ek-config.module';
import { EkConfigService } from './config/ek-config.service';
import { EthersService } from './ethers/ethers.service';
import { LimiterService } from './limiter.service';
import { MoralisService } from './moralis/moralis.service';
import { OpenseaService } from './opensea/opensea.service';
import { SCHEDULER_QUEUE, WORKER_QUEUE } from './util';
import { ClientService, WorkerService } from './worker';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({ useClass: EkConfigService }),
    BullModule.registerQueue({ name: WORKER_QUEUE }, { name: SCHEDULER_QUEUE }),
    CacheModule.registerAsync({ useClass: EkConfigService }),
    EkConfigModule,
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [
    ApmService,
    CacheService,
    ClientService,
    CoingeckoService,
    EkConfigService,
    EthersService,
    LimiterService,
    MoralisService,
    OpenseaService,
    WorkerService,
  ],
  exports: [
    ApmService,
    CacheService,
    ClientService,
    CoingeckoService,
    EkConfigModule,
    EthersService,
    LimiterService,
    MoralisService,
    OpenseaService,
    WorkerService,
  ],
})
export class SdkModule {}
