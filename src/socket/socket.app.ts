import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { RedisModule } from 'nestjs-redis';
import { EkConfigService } from '../sdk/config';
import { EkConfigModule } from '../sdk/config/ek-config.module';
import { SocketService } from './socket.service';

@Module({
  imports: [
    EkConfigModule,
    BullModule.forRootAsync({ useClass: EkConfigService }),
    BullModule.registerQueue({ name: 'CLIENT_EVENT_QUEUE' }),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [SocketService],
})
export class SocketApp {}
