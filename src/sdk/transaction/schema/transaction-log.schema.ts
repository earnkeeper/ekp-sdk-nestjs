import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionLogDocument = TransactionLog & Document;

@Schema()
export class TransactionLog {
  @Prop({ index: true })
  address: string;
  @Prop({ index: true })
  blockNumber: number;
  @Prop()
  blockTimestamp: number;
  @Prop()
  data: string;
  @Prop({ index: true })
  logIndex: number;
  @Prop({ index: true })
  ownerChain: string;
  @Prop({ index: true })
  transactionHash: string;
  @Prop()
  transactionIndex: number;
  @Prop({ index: true })
  topic0: string;
  @Prop({ index: true })
  topic1: string;
  @Prop({ index: true })
  topic2: string;
}

export const TransactionLogSchema = SchemaFactory.createForClass(
  TransactionLog,
).index({ ownerChain: 1, address: 1, topic0: 1 });
