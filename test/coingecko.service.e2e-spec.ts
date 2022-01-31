import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import _ from 'lodash';
import moment from 'moment';
import { SocketApp } from '../src';
import { CoingeckoService } from '../src/sdk/coingecko/coingecko.service';
import { SdkModule } from '../src/sdk/sdk.module';

describe(SocketApp.name, () => {
  let app: INestApplication;
  let coingeckoService: CoingeckoService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SdkModule],
    }).compile();

    app = moduleRef.createNestApplication();
    coingeckoService = moduleRef.get(CoingeckoService);
    await app.init();
  });

  it(`includes from and to dates in fetch market data`, async () => {
    const now = moment();
    const from = now.clone().utc().startOf('day').subtract(1, 'day');
    const to = from.clone().add(1, 'day');

    const results = await coingeckoService.fetchMarketChart(
      'bomber-coin',
      'usd',
      from.unix(),
      to.unix(),
    );

    expect(results.length).toBeGreaterThan(0);

    const dailyPrices = _.chain(results)
      .sortBy('timestamp')
      .uniqBy((result) =>
        moment.unix(result.timestamp).utc().startOf('day').unix(),
      )
      .value();

    expect(dailyPrices).toHaveLength(1);
  });

  afterAll(async () => {
    await app?.close();
  });
});
