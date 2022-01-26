import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bull';
import _ from 'lodash';
import moment from 'moment';
import { OpenseaService, SdkModule } from '../src';
import { OPENSEA_QUEUE } from '../src/sdk/opensea/opensea.service';

const CONTRACT_ADDRESS = '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043';

describe(OpenseaService.name, () => {
  jest.setTimeout(30000);

  let app: INestApplication;
  let openseaService: OpenseaService;
  let openseaQueue: Queue;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SdkModule],
    }).compile();

    app = moduleRef.createNestApplication();
    openseaQueue = app.get(getQueueToken(OPENSEA_QUEUE));
    openseaService = moduleRef.get(OpenseaService);
    await app.init();
  });

  test(`assetOf does not throw`, async () => {
    await openseaService.assetOf(CONTRACT_ADDRESS, '731');
  });

  test(`sync events populates the database`, async () => {
    await openseaQueue.empty();
    const queueCount = await openseaQueue.count();
    expect(queueCount).toEqual(0);

    await openseaService.assetEventModel.remove({
      id: {
        $gte: 0,
      },
    });

    const maxFromDatabase = await openseaService.assetEventModel
      .where({
        contractAddress: CONTRACT_ADDRESS,
      })
      .sort('-createdDate')
      .limit(1)
      .exec();

    expect(maxFromDatabase).toHaveLength(0);

    const startAt = moment().subtract(1, 'hour').unix();

    console.log(startAt);

    const events1 = await openseaService.eventsOf(CONTRACT_ADDRESS, startAt);
    expect(events1).toHaveLength(0);

    await openseaService.processEventsJob({
      data: { tokenAddress: CONTRACT_ADDRESS, startAt: startAt },
    });

    const events2 = await openseaService.eventsOf(CONTRACT_ADDRESS, startAt, [
      'created',
      'successful',
    ]);

    expect(events2.length).toBeGreaterThan(0);

    expect(
      _.every(
        events2,
        (event) =>
          event.event_type === 'created' || event.event_type === 'successful',
      ),
    ).toBeTruthy();

    await openseaService.processEventsJob({
      data: { tokenAddress: CONTRACT_ADDRESS, startAt: startAt },
    });

    const events3 = await openseaService.eventsOf(CONTRACT_ADDRESS, startAt, [
      'created',
      'successful',
    ]);

    expect(events3).toHaveLength(events2.length);
  });

  afterAll(async () => {
    await app?.close();
  });
});
