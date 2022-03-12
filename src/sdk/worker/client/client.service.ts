import {
  ADD_LAYERS,
  ClientDisconnectedEvent,
  ClientStateChangedEvent,
  CLIENT_DISCONNECTED,
  CLIENT_STATE_CHANGED,
  DocumentDto,
  LayerDto,
  LayerQueryDto,
  REMOVE_LAYERS,
} from '@earnkeeper/ekp-sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Redis } from 'ioredis';
import moment from 'moment';
import { RedisService } from 'nestjs-redis';
import { Observable, Subject } from 'rxjs';
import { WORKER_QUEUE } from '../../util';
import { ClientStateRepository } from './client-state.repository';

@Processor(WORKER_QUEUE)
export class ClientService {
  private readonly clientStateEventsSubject =
    new Subject<ClientStateChangedEvent>();

  get clientStateEvents$(): Observable<ClientStateChangedEvent> {
    return this.clientStateEventsSubject as Observable<ClientStateChangedEvent>;
  }

  get latestClientStateEvents(): Promise<ClientStateChangedEvent[]> {
    return this.clientStateRepository.findAll();
  }

  private readonly publishClient: Redis;

  constructor(
    private clientStateRepository: ClientStateRepository,
    redisService: RedisService,
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
    documents: DocumentDto[],
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

  async emitDone(event: ClientStateChangedEvent, collectionName: string) {
    const removeQuery = {
      id: `busy-${collectionName}`,
    };

    await this.removeLayers(event.clientId, removeQuery);
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

  @Process(CLIENT_STATE_CHANGED)
  protected async processClientStateChanged(job: Job<ClientStateChangedEvent>) {
    const event = job.data;

    await this.clientStateRepository.save({
      clientId: event.clientId,
      received: event.received,
      state: event.state,
    });

    this.clientStateEventsSubject.next(event);
  }

  @Process(CLIENT_DISCONNECTED)
  protected async processClientDisconnected(job: Job<ClientDisconnectedEvent>) {
    const clientId = job.data?.clientId;

    await this.clientStateRepository.delete(clientId);
  }
}
