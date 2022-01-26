import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Job, Queue } from 'bull';
import { validate } from 'bycontract';
import moment from 'moment';
import { Model } from 'mongoose';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { AbstractApiService } from '../api/abstract-api.service';
import { AssetContractDto, AssetEventDto } from './dto';
import { AssetEvent } from './schema';

const BASE_URL = 'https://api.opensea.io/api/v1';

export const OPENSEA_QUEUE = 'OPENSEA_QUEUE';
const EVENTS_JOB = 'EVENTS_JOB';

@Injectable()
@Processor(OPENSEA_QUEUE)
export class OpenseaService extends AbstractApiService {
  get apiKey() {
    return this.configService.openseaApiKey;
  }

  // TODO: create an interface for this
  private assetPollsSubject = new Rx.Subject<{
    contractAddress: string;
    events: AssetEventDto[];
  }>();

  get assetPolls$() {
    return this.assetPollsSubject as Observable<{
      contractAddress: string;
      events: AssetEventDto[];
    }>;
  }

  constructor(
    @InjectQueue(OPENSEA_QUEUE) private queue: Queue,
    @InjectModel(AssetEvent.name)
    public assetEventModel: Model<AssetEvent>,
  ) {
    super({
      name: 'OpenseaService',
      limit: 2,
    });
  }

  async syncAssetEvents(tokenAddress: string): Promise<Job<any>> {
    return this.queue.add(
      EVENTS_JOB,
      { tokenAddress, startAt: moment().subtract(1, 'day').unix() },
      {
        repeat: { every: 30000 },
        jobId: `opensea-events-${tokenAddress}`,
      },
    );
  }

  @Process(EVENTS_JOB)
  async processEventsJob(job: Partial<Job<any>>) {
    const { tokenAddress, startAt } = job.data;

    const maxFromDatabase = await this.assetEventModel
      .where({
        contractAddress: tokenAddress,
      })
      .sort('-createdDate')
      .limit(1)
      .exec();

    const occuredAfter = maxFromDatabase[0]?.createdDate ?? startAt;

    const maxPages = 100;
    const pageSize = 100;
    const allEvents = [];

    for (let page = 0; page < maxPages; page++) {
      const nextEvents = await this.fetchEvents(
        tokenAddress,
        occuredAfter,
        pageSize,
        page * pageSize,
      );

      if (nextEvents.length === 0) {
        break;
      }

      await this.assetEventModel.bulkWrite(
        nextEvents.map((newEvent) => {
          const event: AssetEvent = {
            id: newEvent.id,
            contractAddress: tokenAddress,
            createdDate: moment(`${newEvent.created_date}Z`).unix(),
            eventType: newEvent.event_type,
            details: newEvent,
          };

          return {
            updateOne: {
              filter: { id: event.id },
              update: { $set: event },
              upsert: true,
            },
          };
        }),
      );

      allEvents.push(...nextEvents);

      if (nextEvents.length < 100) {
        break;
      }
    }

    if (allEvents.length > 0) {
      this.assetPollsSubject.next({
        contractAddress: tokenAddress,
        events: allEvents,
      });
    }
  }

  metadataOf(contractAddress: string): Promise<AssetContractDto> {
    validate([contractAddress], ['string']);

    const url = `${BASE_URL}/asset_contract/${contractAddress}`;
    const cacheKey = `${url}_v2`;

    return this.get(
      url,
      cacheKey,
      30,
      (response) => response?.data?.collection,
    );
  }

  // TODO: add an interface for this return type
  assetOf(tokenAddress: string, tokenId: string): Promise<any> {
    validate([tokenAddress, tokenId], ['string', 'string']);
    const url = `${BASE_URL}/asset/${tokenAddress}/${tokenId}`;
    const cacheKey = `${url}_v2`;

    return this.get(url, cacheKey, 30, (response) => response?.data);
  }

  async eventsOf(
    tokenAddress: string,
    occurredAfter: number,
    eventTypes?: string[],
  ): Promise<AssetEventDto[]> {
    const query: any = {
      contractAddress: tokenAddress,
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

  fetchEvents(
    tokenAddress: string,
    occurredAfter: number,
    limit: number,
    offset: number,
  ): Promise<AssetEventDto[]> {
    const url = `${BASE_URL}/events?asset_contract_address=${tokenAddress}&only_opensea=false&limit=${limit}&offset=${offset}&occurred_after=${occurredAfter}`;

    return this.get(url, undefined, undefined, (response) => {
      return response?.data?.asset_events ?? [];
    });
  }

  private get<T>(
    url: string,
    cacheKey: string,
    ttl: number,
    parse: (response: AxiosResponse) => T,
  ) {
    const headers = { 'X-API-KEY': this.apiKey, Accept: 'application/json' };

    const catchError = (error: AxiosError) => {
      if (error.response?.status === 404) {
        return undefined;
      }
      throw error;
    };

    return this.wrapCall(
      () => axios.get(url, { headers }).then(parse).catch(catchError),
      {
        cacheKey,
        logDetail: url,
        ttl,
      },
    );
  }
}
