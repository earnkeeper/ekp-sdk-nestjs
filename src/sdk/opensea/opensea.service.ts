import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Job, Queue } from 'bull';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { Model } from 'mongoose';
import * as Rx from 'rxjs';
import {
  concatMap,
  from,
  lastValueFrom,
  mergeMap,
  Observable,
  takeWhile,
  tap,
} from 'rxjs';
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

  private eventCursors: Record<string, number> = {};

  private assetEventsSubject = new Rx.Subject<AssetEventDto>();

  get assetEvents$() {
    return this.assetEventsSubject as Observable<AssetEventDto>;
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

    const occuredAfter = this.eventCursors[tokenAddress] ?? startAt;

    const maxPages = 100;
    const pageSize = 100;

    await lastValueFrom(
      from(_.range(maxPages)).pipe(
        concatMap(async (page) => {
          const newEvents = await this.fetchEvents(
            tokenAddress,
            occuredAfter,
            pageSize,
            page * pageSize,
          );

          return newEvents;
        }),
        takeWhile((events) => events.length > 0),
        mergeMap(async (eventDtos) => {
          await this.assetEventModel.bulkWrite(
            eventDtos.map((eventDto) => {
              const event: AssetEvent = {
                id: eventDto.id,
                contractAddress: tokenAddress,
                createdDate: moment(`${eventDto.created_date}Z`).unix(),
                eventType: eventDto.event_type,
                event: eventDto,
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
          return eventDtos;
        }),
        mergeMap((newEvents) => newEvents),
        tap((event) => this.assetEventsSubject.next(event)),
      ),
    );

    const url = `${BASE_URL}/events?asset_contract_address=${tokenAddress}&only_opensea=false&limit=300&occurred_after=${occuredAfter}`;

    const events = await this.get<AssetEventDto[]>(
      url,
      undefined,
      undefined,
      (response) => response?.data?.asset_events ?? [],
    );

    if (events?.length > 0) {
      this.eventCursors[tokenAddress] = _.chain(events)
        .map((event) => event.created_date ?? event.listing_time)
        .max()
        .value();

      this.assetEventsSubject.next(events);
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

    return events.map((event) => event.event);
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
