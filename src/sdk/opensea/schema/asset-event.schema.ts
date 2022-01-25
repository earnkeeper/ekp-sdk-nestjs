import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AssetEventDto } from '../dto/asset-event.dto';

export type AssetEventDocument = AssetEvent & Document;

@Schema()
export class AssetEvent {
  @Prop({ index: true })
  id: number;

  @Prop({ index: true })
  createdDate: number;

  @Prop({ index: true })
  eventType: string;

  @Prop({ index: true })
  contractAddress: string;

  @Prop({ type: 'object' })
  event: AssetEventDto;
}

export const AssetEventSchema = SchemaFactory.createForClass(AssetEvent);
