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
    offset?: number,
    limit?: number,
  ): Promise<AssetEvent[]> {
    validate([tokenAddress, offset, limit], ['string', 'number=', 'number=']);

    //     --url 'https://api.opensea.io/api/v1/events?asset_contract_address=0x47f75e8dd28df8d6e7c39ccda47026b0dca99043&only_opensea=false&offset=0&limit=20' \
    let url = `${BASE_URL}/events?asset_contract_address=${tokenAddress}&only_opensea=false`;

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
