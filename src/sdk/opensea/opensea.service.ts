import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Job, Queue } from 'bull';
import { validate } from 'bycontract';
import moment from 'moment';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { AbstractApiService } from '../api/abstract-api.service';
import { AssetEventRepository } from './asset-event.repository';
import { AssetContractDto, AssetEventDto } from './dto';
import { AssetEventPollDto } from './dto/asset-event-poll.dto';
import { AssetEvent } from './schema';

const BASE_URL = 'https://api.opensea.io/api/v1';

export const OPENSEA_QUEUE = 'OPENSEA_QUEUE';
const EVENTS_JOB = 'EVENTS_JOB';

@Injectable()
@Processor(OPENSEA_QUEUE)
export class OpenseaService extends AbstractApiService {
  constructor(
    @InjectQueue(OPENSEA_QUEUE) private queue: Queue,
    private assetEventRepository: AssetEventRepository,
  ) {
    super({
      name: 'OpenseaService',
      limit: 2,
    });
  }

  get apiKey() {
    return this.configService.openseaApiKey;
  }

  private assetPollsSubject = new Rx.Subject<AssetEventPollDto>();

  get assetPolls$() {
    return this.assetPollsSubject as Observable<AssetEventPollDto>;
  }

  async syncAssetEventsByContractAddress(
    contractAddress: string,
  ): Promise<Job<any>> {
    return this.queue.add(
      EVENTS_JOB,
      { contractAddress, startAt: moment().subtract(7, 'days').unix() },
      {
        repeat: { every: 30000 },
        jobId: `opensea-events-${contractAddress}`,
      },
    );
  }

  async syncAssetEventsBySlug(slug: string): Promise<Job<any>> {
    return this.queue.add(
      EVENTS_JOB,
      { slug, startAt: moment().subtract(7, 'days').unix() },
      {
        repeat: { every: 30000 },
        jobId: `opensea-events-${slug}`,
      },
    );
  }

  @Process(EVENTS_JOB)
  async processEventsJob(job: Partial<Job<any>>) {
    const { contractAddress, slug, startAt } = job.data;

    let latestDbEvent: AssetEvent;

    if (!!contractAddress) {
      latestDbEvent =
        await this.assetEventRepository.findLatestByContractAddress(
          contractAddress,
        );
    } else {
      latestDbEvent = await this.assetEventRepository.findLatestBySlug(slug);
    }

    const occuredAfter = latestDbEvent?.createdDate ?? startAt;

    const maxPages = 100;
    const pageSize = 100;
    const allEvents = [];

    for (let page = 0; page < maxPages; page++) {
      let nextEvents: AssetEventDto[] = [];

      if (!!contractAddress) {
        nextEvents = await this.fetchEventsByContractAddress(
          contractAddress,
          occuredAfter,
          pageSize,
          page * pageSize,
        );
      } else if (!!slug) {
        nextEvents = await this.fetchEventsBySlug(
          slug,
          occuredAfter,
          pageSize,
          page * pageSize,
        );
      }

      if (nextEvents.length === 0) {
        break;
      }

      await this.assetEventRepository.save(
        nextEvents.map((newEvent) => ({
          id: newEvent.id,
          contractAddress,
          createdDate: moment(`${newEvent.created_date}Z`).unix(),
          details: newEvent,
          eventType: newEvent.event_type,
          slug,
        })),
      );

      allEvents.push(...nextEvents);

      if (nextEvents.length < 100) {
        break;
      }
    }

    if (allEvents.length > 0) {
      this.assetPollsSubject.next({
        contractAddress: contractAddress,
        events: allEvents,
      });
    }
  }

  metadataOf(contractAddress: string): Promise<AssetContractDto> {
    validate([contractAddress], ['string']);

    const url = `${BASE_URL}/asset_contract/${contractAddress}`;

    return this.get(url, 30, (response) => response?.data?.collection);
  }

  // TODO: add an interface for this return type
  assetOf(tokenAddress: string, tokenId: string): Promise<any> {
    validate([tokenAddress, tokenId], ['string', 'string']);
    const url = `${BASE_URL}/asset/${tokenAddress}/${tokenId}`;

    return this.get(url, 30, (response) => response?.data);
  }

  fetchEventsByContractAddress(
    tokenAddress: string,
    occurredAfter: number,
    limit: number,
    offset: number,
  ): Promise<AssetEventDto[]> {
    const url = `${BASE_URL}/events?asset_contract_address=${tokenAddress}&only_opensea=false&limit=${limit}&offset=${offset}&occurred_after=${occurredAfter}`;

    return this.get(url, undefined, (response) => {
      return response?.data?.asset_events ?? [];
    });
  }

  fetchEventsBySlug(
    slug: string,
    occurredAfter: number,
    limit: number,
    offset: number,
  ): Promise<AssetEventDto[]> {
    const url = `${BASE_URL}/events?collection_slug=${slug}&only_opensea=false&limit=${limit}&offset=${offset}&occurred_after=${occurredAfter}`;

    return this.get(url, undefined, (response) => {
      return response?.data?.asset_events ?? [];
    });
  }

  private get<T>(
    url: string,
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

    return this.handleCall(
      {
        url,
        ttl,
      },

      () => axios.get(url, { headers }).then(parse).catch(catchError),
    );
  }
}
