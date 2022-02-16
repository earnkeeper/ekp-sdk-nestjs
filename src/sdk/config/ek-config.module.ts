import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EkConfigService } from './ek-config.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [EkConfigService],
  exports: [EkConfigService],
})
export class EkConfigModule {}
