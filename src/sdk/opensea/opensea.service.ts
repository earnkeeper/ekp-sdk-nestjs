import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { validate } from 'bycontract';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { AbstractApiService } from '../api/abstract-api.service';
import { AssetContractDto, AssetEventDto } from './dto';
import { AssetEventPollDto } from './dto/asset-event-poll.dto';

const BASE_URL = 'https://api.opensea.io/api/v1';

@Injectable()
export class OpenseaService extends AbstractApiService {
  constructor() {
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
