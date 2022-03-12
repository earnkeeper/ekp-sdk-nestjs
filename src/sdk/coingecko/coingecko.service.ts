import { ChainId, chains } from '@earnkeeper/ekp-sdk';
import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import { Mutex } from 'redis-semaphore';
import { AbstractApiService } from '../api/abstract-api.service';
import { LimiterService } from '../limiter.service';
import { logger } from '../util';
import { getAndHandle } from '../util/axios';
import { CoinPrice as CoinPriceDto } from './model/coin-price';
const BASE_URL = 'https://api.coingecko.com/api/v3';

interface GeckoCoin {
  id: string;
  symbol: string;
  platforms: { [name: string]: string };
}

@Injectable()
export class CoingeckoService extends AbstractApiService {
  private fetchAllCoinsMutex: Mutex;

  constructor(limiterService: LimiterService) {
    super({
      name: 'CoingeckoService',
      limit: {
        minTime: 250,
        maxConcurrent: 5,
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60000,
      },
    });

    this.fetchAllCoinsMutex = limiterService.createMutex(
      `${CoingeckoService.name}-fetchallcoins`,
    );
  }

  async onModuleInit() {
    super.onModuleInit();

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    if (this.fetchAllCoinsMutex.isAcquired) {
      return;
    }

    try {
      await this.fetchAllCoinsMutex.acquire();

      this.allCoins = await this.fetchGeckoCoins();
    } finally {
      await this.fetchAllCoinsMutex.release();
    }

    logger.log('Coingecko service initialized');
  }

  private platforms = {
    eth: 'ethereum',
    bsc: 'binance-smart-chain',
    polygon: 'polygon-pos',
  };

  coinIdOf(chainId: ChainId, contractAddress: string) {
    validate([chainId, contractAddress], ['string', 'string']);
    const platform = this.platforms[chainId];
    return this.allCoins.find(
      (geckoCoin) =>
        geckoCoin.platforms[platform] === contractAddress?.toLowerCase(),
    )?.id;
  }

  async getImageUrl(coinId: string): Promise<string> {
    validate([coinId], ['string']);
    const url = `${BASE_URL}/coins/${coinId}`;

    return this.handleCall(
      {
        url,
        ttl: 3600,
      },
      async () => {
        try {
          const response = await axios.get(url);

          if (!response?.data) {
            throw new Error('Failed to fetch token image for: ' + coinId);
          }

          return response.data?.image?.small;
        } catch (error) {
          if (error.response.status === 404) {
            return null;
          }

          throw error;
        }
      },
    );
  }

  async historicPriceOf(
    coinId: string,
    fiatId: string,
    date: number,
  ): Promise<CoinPriceDto> {
    validate([coinId, fiatId, date], ['string', 'string', 'number']);

    const dateMoment = moment.unix(date);

    const url = `${BASE_URL}/coins/${coinId}/history?date=${dateMoment.format(
      'DD-MM-YYYY',
    )}`;
    return this.handleCall(
      {
        url,
        ttl: 0,
      },
      async () => {
        try {
          const response = await axios.get(url);

          if (!response?.data) {
            throw new Error('Failed to fetch currency rates from coingecko');
          }

          if (!response.data?.market_data?.current_price[fiatId]) {
            return undefined;
          }

          const id = `${coinId}_${fiatId}_${dateMoment.unix()}`;

          const price = response.data.market_data.current_price[fiatId];

          return {
            id,
            coinId,
            fiatId,
            price,
            timestamp: date,
          };
        } catch (error) {
          if (error.response.status === 404) {
            return undefined;
          }

          throw error;
        }
      },
    );
  }

  async fetchMarketChart(
    coinId: string,
    fiatId: string,
    from: number,
    to: number,
  ): Promise<CoinPriceDto[]> {
    const url = `${BASE_URL}/coins/${coinId}/market_chart/range?vs_currency=${fiatId}&from=${from}&to=${to}`;

    return this.handleCall(
      {
        url,
      },
      async () => {
        const response = await getAndHandle(url, { allow404: true });

        if (!response?.data) {
          return [];
        }

        const prices: number[][] = response.data?.prices;

        return _.chain(prices)
          .map(
            ([timestamp, price]) =>
              <CoinPriceDto>{
                id: `${coinId}_${fiatId}_${Math.floor(timestamp / 1000)}`,
                coinId,
                fiatId,
                timestamp: Math.floor(timestamp / 1000),
                price,
              },
          )
          .value();
      },
    );
  }

  async nativeCoinPrices(fiatId: string): Promise<Record<string, number>> {
    validate([fiatId], ['string']);

    const chainCoinIds = _.chain(chains)
      .values()
      .map((chain) => chain.token.coinId)
      .value();

    const chainCoinPrices = await this.latestPricesOf(chainCoinIds, fiatId);

    return _.chain(chainCoinPrices)
      .groupBy((coinPrice) => {
        return _.chain(chains)
          .values()
          .filter((it) => it.token.coinId === coinPrice.coinId)
          .map((it) => it.id)
          .first()
          .value();
      })
      .mapValues((prices) => prices[0].price)
      .value();
  }

  async latestPricesOf(
    coinIds: string[],
    fiatId: string,
  ): Promise<CoinPriceDto[]> {
    validate([coinIds, fiatId], ['Array.<string>', 'string']);

    const url = `${BASE_URL}/simple/price?ids=${coinIds.join()}&vs_currencies=${fiatId}`;

    return this.handleCall(
      {
        url,
        ttl: 60,
      },
      async () => {
        const response = await axios.get(url);

        if (!response?.data) {
          throw new Error('Failed to fetch currency rates from coingecko');
        }

        return _.keys(response.data).map((coinId) => {
          return {
            id: `${coinId}_${fiatId}`,
            coinId: coinId,
            fiatId,
            price: response.data[coinId][fiatId.toLowerCase()],
          };
        });
      },
    );
  }

  private allCoins: GeckoCoin[];

  private async fetchGeckoCoins(): Promise<GeckoCoin[]> {
    const url = `${BASE_URL}/coins/list?include_platform=true`;

    return this.handleCall(
      {
        url,
        ttl: 3600,
      },
      async () => {
        const response = await axios.get(url);

        if (!Array.isArray(response.data)) {
          throw new Error(`Could not retrieve coin list from coingecko`);
        }

        const geckoCoins = response.data.map((it) => ({
          id: it.id,
          symbol: it.symbol,
          platforms: it.platforms,
        }));

        return geckoCoins;
      },
    );
  }
}
