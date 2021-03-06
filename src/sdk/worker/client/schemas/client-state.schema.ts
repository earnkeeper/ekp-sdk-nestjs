import { ClientStateDto } from '@earnkeeper/ekp-sdk';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientStateDocument = ClientState & Document;

@Schema()
export class ClientState {
  @Prop({ index: true })
  clientId: string;

  @Prop()
  sent: number;

  @Prop({ index: true })
  received: number;

  @Prop({ type: 'object' })
  state: ClientStateDto;
}

export const ClientStateSchema = SchemaFactory.createForClass(ClientState);
