import { BullModule } from '@nestjs/bull';
import { CacheModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { ClientModule } from './client/client.module';
import { CoingeckoService } from './coingecko/coingecko.service';
import { EkConfigModule } from './config/ek-config.module';
import { EkConfigService } from './config/ek-config.service';
import { EthersService } from './ethers/ethers.service';
import { LimiterService } from './limiter.service';
import { MoralisService } from './moralis/moralis.service';
import { OpenseaService, OPENSEA_QUEUE } from './opensea/opensea.service';
import { AssetEvent, AssetEventSchema } from './opensea/schema';
@Global()
@Module({
  imports: [
    EkConfigModule,
    CacheModule.registerAsync({ useClass: EkConfigService }),
    BullModule.forRootAsync({ useClass: EkConfigService }),
    MongooseModule.forRootAsync({ useClass: EkConfigService }),
    MongooseModule.forFeature([
      { name: AssetEvent.name, schema: AssetEventSchema },
    ]),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
    BullModule.registerQueue({ name: OPENSEA_QUEUE }),
    ClientModule,
  ],
  providers: [
    CoingeckoService,
    EkConfigService,
    EthersService,
    LimiterService,
    MoralisService,
    OpenseaService,
  ],
  exports: [
    ClientModule,
    EkConfigModule,
    CoingeckoService,
    EthersService,
    LimiterService,
    MoralisService,
    OpenseaService,
  ],
})
export class SdkModule {}
