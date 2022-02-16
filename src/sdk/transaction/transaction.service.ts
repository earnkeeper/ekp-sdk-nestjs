import { ChainId } from '@earnkeeper/ekp-sdk';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { Model } from 'mongoose';
import { TokenTransferDto, TransactionDto } from '../moralis/dto';
import { MoralisService } from '../moralis/moralis.service';
import { TokenTransfer, Transaction, TransactionLog } from './schema';

@Injectable()
export class TransactionService {
  constructor(
    private moralisService: MoralisService,
    @InjectModel(TransactionLog.name)
    public transactionLogModel: Model<TransactionLog>,
    @InjectModel(Transaction.name)
    public transactionModel: Model<Transaction>,
    @InjectModel(TokenTransfer.name)
    public tokenTransferModel: Model<TokenTransfer>,
  ) {}

  async tokenTransfersOf(
    chainId: string,
    address: string,
  ): Promise<TokenTransfer[]> {
    const existingModels = await this.tokenTransferModel
      .find({ ownerChain: chainId, ownerAddress: address })
      .exec();

    let startBlock: number;

    if (existingModels.length > 0) {
      startBlock =
        _.chain(existingModels)
          .map((it) => it.blockNumber)
          .max()
          .value() + 1;
    }

    const newModels = [];

    let offset = 0;

    while (true) {
      const nextTxs = await this.moralisService.fetchTokenTransfers(
        chainId as ChainId,
        address,
        startBlock,
        offset,
      );

      if (nextTxs.length === 0) {
        break;
      }

      const nextModels = nextTxs.map((tx) =>
        this.mapMoralisTokenTransfer(tx, chainId, address),
      );

      await this.tokenTransferModel.bulkWrite(
        nextModels.map((model) => ({
          updateOne: {
            filter: { id: model.id },
            update: { $set: model },
            upsert: true,
          },
        })),
      );

      newModels.push(...nextModels);

      offset += nextTxs.length;
    }

    if (newModels.length > 0) {
      return _.sortBy([...existingModels, ...newModels], 'blockNumber');
    }

    return _.sortBy(existingModels, 'blockNumber');
  }

  async contractTokenTransfersOf(
    chainId: string,
    address: string,
  ): Promise<TokenTransfer[]> {
    const existingModels = await this.tokenTransferModel
      .find({ ownerChain: chainId, ownerAddress: address })
      .exec();

    let startBlock: number;

    if (existingModels.length > 0) {
      startBlock =
        _.chain(existingModels)
          .map((it) => it.blockNumber)
          .max()
          .value() + 1;
    }

    const newModels = [];

    let offset = 0;

    while (true) {
      const nextTxs = await this.moralisService.fetchContractTokenTransfers(
        chainId as ChainId,
        address,
        startBlock,
        offset,
      );

      if (nextTxs.length === 0) {
        break;
      }

      const nextModels = nextTxs.map((tx) =>
        this.mapMoralisTokenTransfer(tx, chainId, address),
      );

      await this.tokenTransferModel.bulkWrite(
        nextModels.map((model) => ({
          updateOne: {
            filter: { id: model.id },
            update: { $set: model },
            upsert: true,
          },
        })),
      );

      newModels.push(...nextModels);

      offset += nextTxs.length;
    }

    if (newModels.length > 0) {
      return _.sortBy([...existingModels, ...newModels], 'blockNumber');
    }

    return _.sortBy(existingModels, 'blockNumber');
  }

  async transactionsOf(
    chainId: string,
    address: string,
  ): Promise<Transaction[]> {
    const existingModels = await this.transactionModel
      .find({ ownerChain: chainId, ownerAddress: address })
      .exec();

    let startBlock: number;

    if (existingModels.length > 0) {
      startBlock =
        _.chain(existingModels)
          .map((it) => it.blockNumber)
          .max()
          .value() + 1;
    }

    const newModels = [];

    let offset = 0;

    while (true) {
      const nextTxs = await this.moralisService.fetchTransactions(
        chainId as ChainId,
        address,
        startBlock,
        offset,
      );

      if (nextTxs.length === 0) {
        break;
      }

      const nextModels = nextTxs.map((tx) =>
        this.mapMoralisTransaction(tx, chainId, address),
      );

      newModels.push(...nextModels);

      offset += nextTxs.length;
    }

    if (newModels.length > 0) {
      await this.transactionModel.bulkWrite(
        newModels.map((model) => ({
          updateOne: {
            filter: { ownerChain: model.ownerChain, hash: model.hash },
            update: { $set: model },
            upsert: true,
          },
        })),
      );

      return _.sortBy([existingModels, ...newModels], 'blockNumber');
    }

    return existingModels;
  }

  private mapMoralisTransaction(
    tx: TransactionDto,
    ownerChain: string,
    ownerAddress: string,
  ): Transaction {
    return {
      blockHash: tx.block_hash,
      blockNumber: Number(tx.block_number),
      blockTimestamp: moment(tx.block_timestamp).unix(),
      fromAddress: tx.from_address,
      gas: Number(tx.gas),
      gasPrice: Number(ethers.utils.formatEther(tx.gas_price)),
      hash: tx.hash,
      input: tx.input,
      nonce: Number(tx.nonce),
      ownerAddress,
      ownerChain,
      raw: tx,
      receiptContractAddress: tx.receipt_contract_address,
      receiptCumulativeGasUsed: Number(tx.receipt_cumulative_gas_used),
      receiptGasUsed: Number(tx.receipt_gas_used),
      receiptRoot: tx.receipt_root,
      receiptStatus: tx.receipt_status,
      toAddress: tx.to_address,
      transactionIndex: Number(tx.transaction_index),
      value: tx.value,
    };
  }

  private mapMoralisTokenTransfer(
    tx: TokenTransferDto,
    ownerChain: string,
    ownerAddress: string,
  ): TokenTransfer {
    return {
      id: `${ownerChain}-${tx.transaction_hash}-${tx.from_address}-${tx.to_address}-${tx.value}`,
      ownerAddress,
      ownerChain,
      tokenAddress: tx.address,
      blockHash: tx.block_hash,
      blockNumber: Number(tx.block_number),
      blockTimestamp: moment(tx.block_timestamp).unix(),
      fromAddress: tx.from_address,
      toAddress: tx.to_address,
      transactionHash: tx.transaction_hash,
      value: tx.value,
    };
  }
}
