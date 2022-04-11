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
  RpcEvent,
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

  private readonly rpcEventsSubject = new Subject<RpcEvent>();

  private readonly clientDisconnectedEventsSubject =
    new Subject<ClientDisconnectedEvent>();

  get clientStateEvents$(): Observable<ClientStateChangedEvent> {
    return this.clientStateEventsSubject as Observable<ClientStateChangedEvent>;
  }

  get rpcEvents$(): Observable<RpcEvent> {
    return this.rpcEventsSubject as Observable<RpcEvent>;
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

  addLayers(
    event: ClientStateChangedEvent | ClientConnectedEvent,
    layers: LayerDto[],
  ): Promise<number> {
    const changedEvent = event as ClientStateChangedEvent;

    if (!changedEvent.state) {
      return this.publishClient.publish(
        ADD_LAYERS,
        JSON.stringify({
          clientId: event.clientId,
          originalEvent: undefined,
          layers,
        }),
      );
    }

    return this.publishClient.publish(
      ADD_LAYERS,
      JSON.stringify({
        clientId: changedEvent.clientId,
        originalEvent: {
          sent: changedEvent.sent,
          gameId: changedEvent.state.client.gameId,
          path: changedEvent.state.client.path,
        },
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
    await this.addLayers(event, addLayers);
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
    return this.addLayers(clientEvent, [
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
    return this.addLayers(clientEvent, [
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
    return this.addLayers(clientEvent, [
      {
        id: `menu-${menu.id}`,
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
    return this.addLayers(clientEvent, [
      {
        id: `page-${page.id}`,
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

    await this.removeLayers(event, removeQuery);
  }

  removeLayers(
    event: ClientStateChangedEvent,
    query: LayerQueryDto,
  ): Promise<number> {
    return this.publishClient.publish(
      REMOVE_LAYERS,
      JSON.stringify({
        clientId: event.clientId,
        originalEvent: {
          sent: event.sent,
          gameId: event.state.client.gameId,
          path: event.state.client.path,
        },
        query,
      }),
    );
  }

  async removeOldLayers(
    event: ClientStateChangedEvent,
    collectionName: string,
  ) {
    await this.removeLayers(event, {
      tags: [collectionName],
      timestamp: {
        lt: event.received,
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
      sent: event.sent,
      received: event.received,
      state: event.state,
    });

    this.clientStateEventsSubject.next(event);
  }

  @Process('rpc')
  protected async processRpc(job: Job<RpcEvent>) {
    const event = job.data;

    this.rpcEventsSubject.next(event);
  }

  @Process(CLIENT_DISCONNECTED)
  protected async processClientDisconnected(job: Job<ClientDisconnectedEvent>) {
    const event = job.data;

    const clientId = job.data?.clientId;

    await this.clientStateRepository.delete(clientId);

    this.clientDisconnectedEventsSubject.next(event);
  }
}
