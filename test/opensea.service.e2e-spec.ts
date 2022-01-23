import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import _ from 'lodash';
import { OpenseaService, SdkModule } from '../src';

describe(OpenseaService.name, () => {
  jest.setTimeout(10000);

  let app: INestApplication;
  let openseaService: OpenseaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SdkModule],
    }).compile();

    app = moduleRef.createNestApplication();
    openseaService = moduleRef.get(OpenseaService);
    await app.init();
  });

  test(`assetOf does not throw`, async () => {
    await openseaService.assetOf(
      '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043',
      '731',
    );
  });

  test(`eventsOf does not throw`, async () => {
    const events = await openseaService.eventsOf(
      '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043',
      'created',
      0,
      300,
    );

    expect(events).toHaveLength(300);
  });

  test(`created event_type filters events`, async () => {
    const events = await openseaService.eventsOf(
      '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043',
      'created',
      0,
      300,
    );

    expect(events).toHaveLength(300);

    const distinctEventTypes = _.chain(events)
      .map((it) => it.event_type)
      .uniq()
      .value();

    expect(distinctEventTypes).toHaveLength(1);
    expect(distinctEventTypes[0]).toEqual('created');
  });

  afterAll(async () => {
    await app?.close();
  });
});
