import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientService } from './client.service';
import { ClientState, ClientStateSchema } from './schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ClientState.name, schema: ClientStateSchema },
    ]),
  ],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
