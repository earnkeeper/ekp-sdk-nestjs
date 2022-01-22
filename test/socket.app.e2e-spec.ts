import { getQueueToken } from '@nestjs/bull';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CLIENT_EVENT_QUEUE, SocketApp } from '../src';

describe(SocketApp.name, () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SocketApp],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`adds to queue on connect`, async () => {
    const queue = app.get(getQueueToken(CLIENT_EVENT_QUEUE));
  });

  afterAll(async () => {
    await app?.close();
  });
});
