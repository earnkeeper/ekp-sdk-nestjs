import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Job, Queue } from 'bull';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { AbstractApiService } from '../api/abstract-api.service';
import { AssetContract, AssetEvent } from './model';

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

  private events$ = new Rx.Subject<{
    contractAddress: string;
    events: AssetEvent[];
  }>();

  constructor(@InjectQueue(OPENSEA_QUEUE) private queue: Queue) {
    super({
      name: 'OpenseaService',
      limit: 2,
    });
  }

  pollEvents$(contractAddress: string): Rx.Observable<AssetEvent[]> {
    this.queue.add(
      EVENTS_JOB,
      { contractAddress, started: moment().unix() },
      {
        repeat: { every: 30000 },
        jobId: `opensea-events-${contractAddress}`,
      },
    );

    return this.events$.pipe(
      Rx.filter((it) => it.contractAddress === contractAddress),
      Rx.map((it) => it.events),
    );
  }

  @Process(EVENTS_JOB)
  async processEventsJob(job: Job<any>) {
    const { contractAddress, started } = job.data;

    const occuredAfter = this.eventCursors[contractAddress] ?? started;

    const url = `${BASE_URL}/events?asset_contract_address=${contractAddress}&only_opensea=false&limit=300&occurred_after=${occuredAfter}`;

    const events = await this.get<AssetEvent[]>(
      url,
      undefined,
      undefined,
      (response) => response?.data?.asset_events ?? [],
    );

    if (events?.length > 0) {
      this.eventCursors[contractAddress] = _.chain(events)
        .map((event) => event.created_date ?? event.listing_time)
        .max()
        .value();

      this.events$.next(events);
    }
  }

  metadataOf(contractAddress: string): Promise<AssetContract> {
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

  eventsOf(
    tokenAddress: string,
    occurredAfter: number,
    eventType?: string,
  ): Promise<AssetEvent[]> {
    validate(
      [tokenAddress, eventType, occurredAfter],
      ['string', 'string=', 'number='],
    );

    let url = `${BASE_URL}/events?asset_contract_address=${tokenAddress}&only_opensea=false&limit=300`;

    if (eventType !== undefined) {
      url += `&event_type=${eventType}`;
    }

    const cacheKey = `${url}_v1`;

    return this.get(
      url,
      cacheKey,
      30,
      (response) => response?.data?.asset_events ?? [],
    );
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
