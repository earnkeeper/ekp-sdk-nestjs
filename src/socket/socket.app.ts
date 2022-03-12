import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { RedisModule } from 'nestjs-redis';
import { EkConfigModule } from '../sdk/config/ek-config.module';
import { EkConfigService } from '../sdk/config/ek-config.service';
import { WORKER_QUEUE } from '../sdk/util';
import { SocketService } from './socket.service';

@Module({
  imports: [
    EkConfigModule,
    BullModule.forRootAsync({ useClass: EkConfigService }),
    BullModule.registerQueue({ name: WORKER_QUEUE }),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [SocketService],
})
export class SocketApp {}
