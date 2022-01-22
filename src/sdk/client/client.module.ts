import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CLIENT_EVENT_QUEUE } from '../util';
import { ClientService } from './client.service';
import { ClientState, ClientStateSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClientState.name, schema: ClientStateSchema },
    ]),
    BullModule.registerQueue({ name: CLIENT_EVENT_QUEUE }),
  ],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
