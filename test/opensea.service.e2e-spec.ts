import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
      0,
      300,
    );

    expect(events).toHaveLength(300);
  });

  afterAll(async () => {
    await app?.close();
  });
});
