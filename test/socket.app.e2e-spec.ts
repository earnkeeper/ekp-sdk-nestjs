import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bull';
import { ClientStateDto, CLIENT_EVENT_QUEUE, SocketApp } from '../src';
import { SocketService } from '../src/socket/socket.service';

describe(SocketApp.name, () => {
  let app: INestApplication;
  let clientEventQueue: Queue;
  let socketService: SocketService;
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
      imports: [SocketApp],
    }).compile();

    app = moduleRef.createNestApplication();

    await app.init();
    clientEventQueue = app.get(getQueueToken(CLIENT_EVENT_QUEUE));
    socketService = app.get(SocketService);
    await clientEventQueue.empty();
  });

  it(`adds to queue on client state changed`, async () => {
    let count = await clientEventQueue.count();
    expect(count).toEqual(0);

    await socketService.queueClientStateChangedEvent({
      clientId: 'test',
      state: clientStateDtoFixture,
    });

    count = await clientEventQueue.count();

    expect(count).toEqual(1);
  });

  afterAll(async () => {
    await app?.close();
  });
});
