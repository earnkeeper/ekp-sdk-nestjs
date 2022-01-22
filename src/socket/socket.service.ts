import { InjectQueue } from '@nestjs/bull';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Queue } from 'bull';
import { validate } from 'bycontract';
import { Redis } from 'ioredis';
import moment from 'moment';
import { RedisService } from 'nestjs-redis';
import { Server, Socket } from 'socket.io';
import { EkConfigService } from '../sdk/config';
import { LayerDto } from '../sdk/dtos';
import {
  AddLayersEvent,
  ADD_LAYERS,
  CLIENT_CONNECTED,
  CLIENT_DISCONNECTED,
  CLIENT_STATE_CHANGED,
  RemoveLayersEvent,
  REMOVE_LAYERS,
  UPDATE_METADATA,
} from '../sdk/events';
import { CLIENT_EVENT_QUEUE, logger } from '../sdk/util';

@WebSocketGateway({ cors: true })
export class SocketService {
  private subscribeClient: Redis;

  constructor(
    @InjectQueue(CLIENT_EVENT_QUEUE) private clientEventQueue: Queue,
    private configService: EkConfigService,
    redisService: RedisService,
  ) {
    this.subscribeToEmits(redisService);
  }

  @WebSocketServer()
  private socketServer: Server;

  handleConnection(socket: Socket) {
    logger.log(`Client connected: ${socket.id}`);

    socket.emit(
      UPDATE_METADATA,
      JSON.stringify({
        pluginId: this.configService.pluginId,
        pluginName: this.configService.pluginName,
      }),
    );

    this.clientEventQueue.add(CLIENT_CONNECTED, {
      clientId: socket.id,
    });
  }

  handleDisconnect(socket: Socket) {
    logger.log(`Client disconnected: ${socket.id}`);

    this.clientEventQueue.add(CLIENT_DISCONNECTED, {
      clientId: socket.id,
    });
  }

  @SubscribeMessage(CLIENT_STATE_CHANGED)
  handleClientStateChangedMessage(client: Socket, payload: any) {
    logger.log(`Received CLIENT_STATE_CHANGED: ${client.id}`);

    this.clientEventQueue.add(CLIENT_STATE_CHANGED, {
      clientId: client.id,
      ...JSON.parse(payload),
    });
  }

  emitAddLayers(addLayersEvent: AddLayersEvent) {
    const clientId = validate(addLayersEvent.clientId, 'string');
    const layers = validate(addLayersEvent.layers, 'Array.<object>');

    const now = moment().unix();

    const updatedLayers = layers.map((layer: LayerDto) => {
      logger.log(`Emit ADD_LAYER ${layer.id} to ${clientId}`);

      return {
        ...layer,
        timestamp: layer.timestamp || now,
      };
    });

    this.socketServer.to(clientId).emit(
      ADD_LAYERS,
      JSON.stringify({
        pluginId: this.configService.pluginId,
        layers: updatedLayers,
      }),
    );
  }

  emitRemoveLayers(removeLayersEvent: RemoveLayersEvent) {
    const clientId = validate(removeLayersEvent.clientId, 'string');
    const query = validate(removeLayersEvent.query, 'object');

    logger.log(`Emit REMOVE_LAYERS to ${clientId}`);

    this.socketServer.to(clientId).emit(
      REMOVE_LAYERS,
      JSON.stringify({
        pluginId: this.configService.pluginId,
        query,
      }),
    );
  }

  private subscribeToEmits(redisService: RedisService) {
    this.subscribeClient = redisService.getClient('SUBSCRIBE_CLIENT');

    this.subscribeClient.subscribe(ADD_LAYERS, (err, count) => {
      if (err) {
        logger.error(err);
      }
      logger.log(`SocketsGateway subscribed to the "add-layers" redis message`);
    });

    this.subscribeClient.subscribe(REMOVE_LAYERS, (err, count) => {
      if (err) {
        logger.error(err);
      }
      logger.log(
        `SocketsGateway subscribed to the "remove-layers" redis message`,
      );
    });

    this.subscribeClient.on('message', (channel, message) => {
      const payload = JSON.parse(message);

      if (channel === ADD_LAYERS) {
        this.emitAddLayers(payload);
      }

      if (channel === REMOVE_LAYERS) {
        this.emitRemoveLayers(payload);
      }
    });
  }
}
