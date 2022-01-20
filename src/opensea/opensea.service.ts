import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { validate } from 'bycontract';
import { AbstractApiService } from '../api/abstract-api.service';
import { AssetContract } from './model';

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
    const cacheKey = `${url}_v1`;

    return this.get(url, cacheKey, 30).then(
      (response) => response?.data?.collection,
    );
  }

  // TODO: add an interface for this return type
  assetOf(tokenAddress: string, tokenId: string): Promise<any> {
    validate([tokenAddress], ['string']);

    const url = `${BASE_URL}/asset/${tokenAddress}/${tokenId}`;
    const cacheKey = `${url}_v1`;

    return this.get(url, cacheKey, 30).then((response) => response?.data);
  }

  private get(url: string, cacheKey: string, ttl: number) {
    const headers = { 'X-API-KEY': this.apiKey, Accept: 'application/json' };

    const catchError = (error) => {
      if (error.response?.status === 404) {
        return undefined;
      }
      throw error;
    };

    return this.wrapCall(() => axios.get(url, { headers }).catch(catchError), {
      cacheKey,
      logDetail: url,
      ttl,
    });
  }
}
