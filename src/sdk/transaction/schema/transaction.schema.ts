import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema()
export class Transaction {
  @Prop({ index: true })
  blockHash: string;
  @Prop({ index: true })
  blockNumber: number;
  @Prop({ index: true })
  blockTimestamp: number;
  @Prop({ index: true })
  fromAddress: string;
  @Prop()
  gas: number;
  @Prop()
  gasPrice: number;
  @Prop({ index: true })
  hash: string;
  @Prop()
  input: string;
  @Prop()
  nonce: number;
  @Prop({ index: true })
  ownerAddress: string;
  @Prop({ index: true })
  ownerChain: string;
  @Prop({ type: 'object' })
  raw: any;
  @Prop({ index: true })
  receiptContractAddress: string;
  @Prop()
  receiptCumulativeGasUsed: number;
  @Prop()
  receiptGasUsed: number;
  @Prop()
  receiptRoot: string;
  @Prop({ index: true })
  receiptStatus: string;
  @Prop({ index: true })
  toAddress: string;
  @Prop()
  transactionIndex: number;
  @Prop()
  value: string;
}

export const TransactionSchema = SchemaFactory.createForClass(
  Transaction,
).index({ ownerChain: 1, hash: 1 });
