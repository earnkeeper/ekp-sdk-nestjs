import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TokenTransferDocument = TokenTransfer & Document;

@Schema()
export class TokenTransfer {
  @Prop({ index: true })
  id: string;
  @Prop({ index: true })
  ownerAddress: string;
  @Prop({ index: true })
  ownerChain: string;

  @Prop({ index: true })
  tokenAddress: string;
  @Prop()
  blockHash: string;
  @Prop({ index: true })
  blockNumber: number;
  @Prop({ index: true })
  blockTimestamp: number;
  @Prop()
  fromAddress: string;
  @Prop()
  toAddress: string;
  @Prop({ index: true })
  transactionHash: string;
  @Prop()
  value: string;
}

export const TokenTransferSchema = SchemaFactory.createForClass(
  TokenTransfer,
).index({ ownerChain: 1, hash: 1 });
