import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import _ from 'lodash';
import moment from 'moment';
import { SocketApp } from '../src';
import { PriceService } from '../src/sdk/price/price.service';
import { SdkModule } from '../src/sdk/sdk.module';

describe(SocketApp.name, () => {
  let app: INestApplication;
  let priceService: PriceService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SdkModule],
    }).compile();

    app = moduleRef.createNestApplication();
    priceService = moduleRef.get(PriceService);
    await app.init();
  });

  it.skip(`fetches daily prices without error and results are as expected`, async () => {
    const results = await priceService.dailyFiatPricesOf(
      'bsc',
      '0x00e1656e45f18ec6747f5a8496fd39b50b38396d',
      'usd',
    );

    const minTimestamp = _.chain(results)
      .minBy('timestamp')
      .get('timestamp')
      .value();

    expect(minTimestamp).toEqual(1632441600);

    const allTimestampsAreUtcMidnight = _.every(results, (result) => {
      const m = moment.unix(result.timestamp).utc();
      return m.clone().startOf('day').isSame(m);
    });

    expect(allTimestampsAreUtcMidnight).toBeTruthy();

    const daysOfData = moment().diff(moment.unix(minTimestamp), 'days');

    expect(daysOfData).toEqual(results.length - 1);
  });

  it(`fetches latest data after a sync, and does not duplicate`, async () => {
    // Clear the database for testing
    await priceService.fiatPriceModel.deleteMany({ timestamp: { $gte: 0 } });

    // Sync the data to today
    const results = await priceService.dailyFiatPricesOf(
      'bsc',
      '0x00e1656e45f18ec6747f5a8496fd39b50b38396d',
      'usd',
    );

    // Get the latest record id
    const latestId = _.chain(results).maxBy('timestamp').get('id').value();

    // Delete the record from the database
    await priceService.fiatPriceModel.deleteOne({ id: latestId });

    // Sync again
    const results2 = await priceService.dailyFiatPricesOf(
      'bsc',
      '0x00e1656e45f18ec6747f5a8496fd39b50b38396d',
      'usd',
    );

    // Expect the new results to have the same length as the old results
    expect(results.length).toEqual(results2.length);
  });

  afterAll(async () => {
    await app?.close();
  });
});
