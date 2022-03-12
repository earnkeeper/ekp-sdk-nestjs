import {
  ADD_LAYERS,
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  ClientStateChangedEvent,
  CLIENT_CONNECTED,
  CLIENT_DISCONNECTED,
  CLIENT_STATE_CHANGED,
  DocumentDto,
  LayerDto,
  LayerQueryDto,
  MenuElementDto,
  PageRouteDto,
  REMOVE_LAYERS,
} from '@earnkeeper/ekp-sdk';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Redis } from 'ioredis';
import moment from 'moment';
import { RedisService } from 'nestjs-redis';
import { Observable, Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { WORKER_QUEUE } from '../../util';
import { ClientStateRepository } from './client-state.repository';

@Processor(WORKER_QUEUE)
export class ClientService {
  private readonly clientStateEventsSubject =
    new Subject<ClientStateChangedEvent>();

  private readonly clientConnectedEventsSubject =
    new Subject<ClientConnectedEvent>();

  private readonly clientDisconnectedEventsSubject =
    new Subject<ClientDisconnectedEvent>();

  get clientStateEvents$(): Observable<ClientStateChangedEvent> {
    return this.clientStateEventsSubject as Observable<ClientStateChangedEvent>;
  }

  get clientConnectedEvents$(): Observable<ClientConnectedEvent> {
    return this
      .clientConnectedEventsSubject as Observable<ClientConnectedEvent>;
  }

  get clientDisconnectedEvents$(): Observable<ClientDisconnectedEvent> {
    return this
      .clientDisconnectedEventsSubject as Observable<ClientDisconnectedEvent>;
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

  /**
   * Emit a partial set of documents to the client, each with a new layer id
   *
   *
   * @param clientEvent event containing client details
   * @param collectionName the collection name to emit to
   * @param documents the partial set of documents to emit
   * @returns a promise that resolves once emitted
   */
  async emitPartialDocuments(
    clientEvent: ClientStateChangedEvent,
    collectionName: string,
    documents: DocumentDto[],
  ) {
    return this.addLayers(clientEvent.clientId, [
      {
        id: uuidv4(),
        collectionName,
        set: documents,
        tags: [collectionName],
        timestamp: moment().unix(),
      },
    ]);
  }

  async emitMenu(
    clientEvent: ClientConnectedEvent | ClientStateChangedEvent,
    menu: MenuElementDto,
  ) {
    return this.addLayers(clientEvent.clientId, [
      {
        id: menu.id,
        collectionName: 'menus',
        set: [menu],
        timestamp: moment().unix(),
      },
    ]);
  }

  async emitPage(
    clientEvent: ClientConnectedEvent | ClientStateChangedEvent,
    page: PageRouteDto,
  ) {
    return this.addLayers(clientEvent.clientId, [
      {
        id: page.id,
        collectionName: 'pages',
        set: [page],
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

  async removeOldLayers(
    clientStateChangedEvent: ClientStateChangedEvent,
    collectionName: string,
  ) {
    await this.removeLayers(clientStateChangedEvent.clientId, {
      tags: [collectionName],
      timestamp: {
        lt: clientStateChangedEvent.received,
      },
    });
  }

  @Process(CLIENT_CONNECTED)
  protected async processClientConnected(job: Job<ClientConnectedEvent>) {
    const event = job.data;

    this.clientConnectedEventsSubject.next(event);
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
    const event = job.data;

    const clientId = job.data?.clientId;

    await this.clientStateRepository.delete(clientId);

    this.clientDisconnectedEventsSubject.next(event);
  }
}
