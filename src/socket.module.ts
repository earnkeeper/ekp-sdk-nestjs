import { BullModule } from '@nestjs/bull';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from 'nestjs-redis';
import { EkConfigService } from './config/ek-config.service';
import { SocketGateway } from './socket/socket.gateway';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({ useClass: EkConfigService }),
    RedisModule.forRootAsync(EkConfigService.createRedisAsyncOptions()),
  ],
  providers: [SocketGateway, EkConfigService],
  exports: [EkConfigService],
})
export class SocketModule {}
