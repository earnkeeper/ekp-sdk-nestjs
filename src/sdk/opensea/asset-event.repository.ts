import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { validate } from 'bycontract';
import _ from 'lodash';
import { Model } from 'mongoose';
import { AssetEventDto } from './dto';
import { AssetEvent } from './schema';

@Injectable()
export class AssetEventRepository {
  constructor(
    @InjectModel(AssetEvent.name)
    public assetEventModel: Model<AssetEvent>,
  ) {}

  async findLatestByContractAddress(
    contractAddress: string,
  ): Promise<AssetEvent> {
    const events = await this.assetEventModel
      .where({ contractAddress })
      .sort('-createdDate')
      .limit(1)
      .exec();

    if (events.length === 0) {
      return undefined;
    }

    return events[0];
  }

  async findLatestBySlug(slug: string): Promise<AssetEvent> {
    const events = await this.assetEventModel
      .where({ slug })
      .sort('-createdDate')
      .limit(1)
      .exec();

    if (events.length === 0) {
      return undefined;
    }

    return events[0];
  }

  async findByContractAddress(
    contractAddress: string,
    occurredAfter: number,
    eventTypes?: string[],
  ): Promise<AssetEventDto[]> {
    const query: any = {
      contractAddress,
      createdDate: {
        $gte: occurredAfter,
      },
    };

    if (!!eventTypes) {
      query.eventType = {
        $in: eventTypes,
      };
    }

    const events = await this.assetEventModel.find(query).exec();

    return events.map((event) => event.details);
  }

  async findBySlug(
    slug: string,
    occurredAfter: number,
    eventTypes?: string[],
  ): Promise<AssetEventDto[]> {
    const query: any = {
      slug,
      createdDate: {
        $gte: occurredAfter,
      },
    };

    if (!!eventTypes) {
      query.eventType = {
        $in: eventTypes,
      };
    }

    const events = await this.assetEventModel.find(query).exec();

    return events.map((event) => event.details);
  }

  async save(events: AssetEvent[]): Promise<void> {
    validate([events], ['Array.<object>']);

    if (events.length === 0) {
      return;
    }

    await this.assetEventModel.bulkWrite(
      events.map((model) => ({
        updateOne: {
          filter: {
            id: model.id,
          },
          update: {
            $set: _.pick(model, [
              'id',
              'contractAddress',
              'createdDate',
              'eventType',
              'slug',
              'details',
            ]),
          },
          upsert: true,
        },
      })),
    );
  }
}
