import { Process, Processor } from '@nestjs/bull';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bull';
import { Redis } from 'ioredis';
import moment from 'moment';
import { Model } from 'mongoose';
import { RedisService } from 'nestjs-redis';
import { Observable, Subject } from 'rxjs';
import { EkDocument, LayerDto, LayerQueryDto } from '../dtos';
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
        recevied: event.received,
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

  /**
   * Emit documents to the client
   *
   *
   * @param clientEvent event containing client details
   * @param collectionName the collection name to emit to
   * @param documents the documents to emit
   * @returns a promise that resolves once emitted
   */
  async emitDocuments(
    clientEvent: ClientStateChangedEvent,
    collectionName: string,
    documents: EkDocument[],
  ) {
    return this.addLayers(clientEvent.clientId, [
      {
        id: `${collectionName}-documents`,
        collectionName,
        set: documents,
        tags: [collectionName],
        timestamp: moment().unix(),
      },
    ]);
  }

  async emitBusy(event: ClientStateChangedEvent, collectionName: string) {
    const addLayers = [
      {
        id: `busy-${collectionName}`,
        collectionName: 'busy',
        set: [{ id: collectionName }],
      },
    ];
    await this.addLayers(event.clientId, addLayers);
  }

  async emitDone(event: ClientStateChangedEvent, collectionName: string) {
    const removeQuery = {
      id: `busy-${collectionName}`,
    };

    await this.removeLayers(event.clientId, removeQuery);
  }
}
