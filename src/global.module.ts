import { BullModule } from '@nestjs/bull';
import { CacheModule, Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { CoingeckoService } from './coingecko/coingecko.service';
import { EkConfigService } from './config/ek-config.service';
import { LimiterService } from './limiter.service';
import { MoralisService } from './moralis/moralis.service';
import { OpenseaService } from './opensea/opensea.service';
import { EventService } from './socket/event.service';
import { EthersService } from './ethers/ethers.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({ useClass: EkConfigService }),
    BullModule.forRootAsync({ useClass: EkConfigService }),
    EventEmitterModule.forRoot(),
    // MongooseModule.forRootAsync({ useClass: EkConfigService }),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [
    CoingeckoService,
    EkConfigService,
    EthersService,
    EventService,
    LimiterService,
    MoralisService,
    OpenseaService,
  ],
  exports: [
    CoingeckoService,
    EkConfigService,
    EthersService,
    LimiterService,
    EventService,
    MoralisService,
    OpenseaService,
  ],
})
export class GlobalModule {}
