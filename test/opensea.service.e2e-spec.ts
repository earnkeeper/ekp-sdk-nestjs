import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalModule } from '../src/global.module';
import { OpenseaService } from '../src/opensea/opensea.service';

describe('OpenseaService', () => {
  let app: INestApplication;
  let openseaService: OpenseaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalModule],
    }).compile();

    app = moduleRef.createNestApplication();
    openseaService = moduleRef.get(OpenseaService);
    await app.init();
  });

  test(`works with an opensea proxy`, async () => {
    const asset = await openseaService.assetOf(
      '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043',
      '731',
    );

    console.log(asset);
  });

  afterAll(async () => {
    await app?.close();
  });
});
