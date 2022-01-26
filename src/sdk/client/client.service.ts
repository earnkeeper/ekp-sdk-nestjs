import { Process, Processor } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import { Redis } from 'ioredis';
import { Model } from 'mongoose';
import { RedisService } from 'nestjs-redis';
import { Observable, Subject } from 'rxjs';
import { LayerDto, LayerQueryDto } from '../dtos';
import {
  ADD_LAYERS,
  ClientDisconnectedEvent,
  ClientStateChangedEvent,
  CLIENT_DISCONNECTED,
  CLIENT_STATE_CHANGED,
  REMOVE_LAYERS,
} from '../events';
import { CLIENT_EVENT_QUEUE } from '../util';
import { ClientState, ClientStateDocument } from './schemas';

@Processor(CLIENT_EVENT_QUEUE)
export class ClientService {
  private readonly publishClient: Redis;

  constructor(
    redisService: RedisService,
    @InjectModel(ClientState.name)
    private clientStateModel: Model<ClientStateDocument>,
  ) {
    this.publishClient = redisService.getClient('PUBLISH_CLIENT');
  }

  addLayers(clientId: string, layers: LayerDto[]): Promise<number> {
    return this.publishClient.publish(
      ADD_LAYERS,
      JSON.stringify({
        clientId,
        layers,
      }),
    );
  }

  removeLayers(clientId: string, query: LayerQueryDto): Promise<number> {
    return this.publishClient.publish(
      REMOVE_LAYERS,
      JSON.stringify({
        clientId,
        query,
      }),
    );
  }

  private clientStateEventsSubject = new Subject<ClientStateChangedEvent>();

  get clientStateEvents$(): Observable<ClientStateChangedEvent> {
    return this.clientStateEventsSubject as Observable<ClientStateChangedEvent>;
  }

  get latestClientStateEvents(): Promise<ClientStateChangedEvent[]> {
    return this.clientStateModel.find().exec();
  }

  @Process(CLIENT_STATE_CHANGED)
  async processClientStateChanged(job: Job<ClientStateChangedEvent>) {
    const event = job.data;

    await this.clientStateModel.findOneAndUpdate(
      { clientId: event.clientId },
      {
        clientId: event.clientId,
        state: event.state,
      },
      { upsert: true },
    );

    this.clientStateEventsSubject.next(event);
  }

  @Process(CLIENT_DISCONNECTED)
  async processClientDisconnected(job: Job<ClientDisconnectedEvent>) {
    const clientId = job.data?.clientId;

    await this.clientStateModel.findOneAndDelete({ clientId: clientId });
  }
}
