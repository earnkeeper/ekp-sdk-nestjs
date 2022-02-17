import {
  ClientStateChangedEvent,
  ClientStateDto,
  CLIENT_STATE_CHANGED,
} from '@earnkeeper/ekp-sdk';
import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Queue } from 'bull';
import {
  ClientService,
  CLIENT_EVENT_QUEUE,
  EkConfigService,
  SdkModule,
} from '../src';

describe(ClientService.name, () => {
  let app: INestApplication;
  let clientEventQueue: Queue;
  let clientService: ClientService;

  const clientStateDtoFixture: ClientStateDto = {
    client: {
      path: 'plugins/test/path',
      hiddenChains: [],
      selectedCurrency: {
        id: 'usd',
        symbol: '$',
      },
      watchedWallets: [],
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({ useClass: EkConfigService }),
        SdkModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
    clientEventQueue = app.get(getQueueToken(CLIENT_EVENT_QUEUE));
    clientService = app.get(ClientService);
    await clientEventQueue.empty();
  });

  it(`emits when client state changes`, async () => {
    const count = await clientEventQueue.count();
    expect(count).toEqual(0);
    let received: ClientStateChangedEvent;

    clientService.clientStateEvents$.subscribe((it) => (received = it));
    expect(received).toBeUndefined();

    const job = await clientEventQueue.add(CLIENT_STATE_CHANGED, {
      clientId: 'test',
      state: clientStateDtoFixture,
    });

    await job.finished();

    expect(received).toBeDefined();
    expect(received.clientId).toEqual('test');
    expect(received.state).toEqual(clientStateDtoFixture);
  });

  afterAll(async () => {
    await app?.close();
  });
});
