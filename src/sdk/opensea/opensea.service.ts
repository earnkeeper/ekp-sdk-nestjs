import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { validate } from 'bycontract';
import { AbstractApiService } from '../api/abstract-api.service';
import { AssetContract, AssetEvent } from './model';

const BASE_URL = 'https://api.opensea.io/api/v1';

@Injectable()
export class OpenseaService extends AbstractApiService {
  get apiKey() {
    return this.configService.openseaApiKey;
  }

  constructor() {
    super({
      name: 'OpenseaService',
      limit: 2,
    });
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
    eventType?: string,
    offset?: number,
    limit?: number,
  ): Promise<AssetEvent[]> {
    validate(
      [tokenAddress, eventType, offset, limit],
      ['string', 'string=', 'number=', 'number='],
    );

    let url = `${BASE_URL}/events?asset_contract_address=${tokenAddress}&only_opensea=false`;

    if (eventType !== undefined) {
      url += `&event_type=${eventType}`;
    }

    if (offset !== undefined) {
      url += `&offset=${offset}`;
    }

    if (limit !== undefined) {
      url += `&limit=${limit}`;
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
