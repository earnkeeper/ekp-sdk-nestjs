import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ClientStateDto } from '../../dtos';

export type ClientStateDocument = ClientState & Document;

@Schema()
export class ClientState {
  @Prop({ index: true })
  clientId: string;

  @Prop({ type: 'object' })
  state: ClientStateDto;
}

export const ClientStateSchema = SchemaFactory.createForClass(ClientState);
