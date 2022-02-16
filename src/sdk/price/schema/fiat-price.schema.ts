import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FiatPriceDocument = FiatPrice & Document;

@Schema()
export class FiatPrice {
  @Prop({ index: true })
  id: string;
  @Prop({ index: true })
  chainId: string;
  @Prop({ index: true })
  fiatId: string;
  @Prop({ index: true })
  tokenAddress: string;
  @Prop({ index: true })
  timestamp: number;

  @Prop()
  price: number;
  @Prop()
  source: string;
  @Prop()
  sourceId: string;
}

export const FiatPriceSchema = SchemaFactory.createForClass(FiatPrice).index({
  chainId: 1,
  tokenAddress: 1,
  fiatId: 1,
});
