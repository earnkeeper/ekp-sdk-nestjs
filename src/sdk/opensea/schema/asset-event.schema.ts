import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AssetEventDto } from '../dto/asset-event.dto';

export type AssetEventDocument = AssetEvent & Document;

@Schema()
export class AssetEvent {
  @Prop({ index: true })
  id: number;

  @Prop()
  contractAddress?: string;
  @Prop()
  createdDate: number;
  @Prop()
  eventType: string;
  @Prop()
  slug?: string;

  @Prop({ type: 'object' })
  details: AssetEventDto;
}

export const AssetEventSchema = SchemaFactory.createForClass(AssetEvent)
  .index({
    contractAddress: 1,
    createdDate: 1,
  })
  .index({
    contractAddress: 1,
    createdDate: 1,
    eventType: 1,
  })
  .index({
    slug: 1,
    createdDate: 1,
  })
  .index({
    slug: 1,
    createdDate: 1,
    eventType: 1,
  });
