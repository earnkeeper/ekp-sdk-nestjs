import { BullModule } from '@nestjs/bull';
import { CacheModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from 'nestjs-redis';
import { ApmService } from './apm/apm.service';
import { CacheService } from './cache/cache.service';
import { CoingeckoService } from './coingecko/coingecko.service';
import { EkConfigModule } from './config/ek-config.module';
import { EkConfigService } from './config/ek-config.service';
import { EthersService } from './ethers/ethers.service';
import { LimiterService } from './limiter.service';
import { MoralisService } from './moralis/moralis.service';
import { AssetEventRepository } from './opensea/asset-event.repository';
import { OpenseaService, OPENSEA_QUEUE } from './opensea/opensea.service';
import { AssetEvent, AssetEventSchema } from './opensea/schema';
import { PriceService } from './price/price.service';
import { FiatPrice, FiatPriceSchema } from './price/schema';
import {
  TokenTransfer,
  TokenTransferSchema,
  Transaction,
  TransactionLog,
  TransactionLogSchema,
  TransactionSchema,
} from './transaction/schema';
import { TransactionService } from './transaction/transaction.service';
import { WORKER_QUEUE } from './util';
import { ClientService, WorkerService } from './worker';
import { ClientStateRepository } from './worker/client/client-state.repository';
import { ClientState, ClientStateSchema } from './worker/client/schemas';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({ useClass: EkConfigService }),
    BullModule.registerQueue({ name: OPENSEA_QUEUE }, { name: WORKER_QUEUE }),
    CacheModule.registerAsync({ useClass: EkConfigService }),
    EkConfigModule,
    MongooseModule.forFeature([
      { name: AssetEvent.name, schema: AssetEventSchema },
      { name: ClientState.name, schema: ClientStateSchema },
      { name: FiatPrice.name, schema: FiatPriceSchema },
      { name: TokenTransfer.name, schema: TokenTransferSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: TransactionLog.name, schema: TransactionLogSchema },
    ]),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [
    ApmService,
    AssetEventRepository,
    CacheService,
    ClientService,
    ClientStateRepository,
    CoingeckoService,
    EkConfigService,
    EthersService,
    LimiterService,
    MoralisService,
    OpenseaService,
    PriceService,
    TransactionService,
    WorkerService,
  ],
  exports: [
    ApmService,
    AssetEventRepository,
    CacheService,
    ClientService,
    ClientStateRepository,
    CoingeckoService,
    EkConfigModule,
    EthersService,
    LimiterService,
    MoralisService,
    OpenseaService,
    PriceService,
    TransactionService,
    WorkerService,
  ],
})
export class SdkModule {}
