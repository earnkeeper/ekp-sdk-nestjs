import { Injectable } from '@nestjs/common';
import { RedisService } from 'nestjs-redis';
import { PUBLISH_CLIENT } from '../config/ek-config.service';
import { Redis } from 'ioredis';
import { ADD_LAYERS, LayerQueryDto, REMOVE_LAYERS } from './events';
import { LayerDto } from './dtos/layer.dto';

@Injectable()
export class EventService {
  constructor(redisService: RedisService) {
    this.publishClient = redisService.getClient(PUBLISH_CLIENT);
  }

  private readonly publishClient: Redis;

  addLayers(channelId: string, layers: LayerDto[]) {
    this.publishClient.publish(
      ADD_LAYERS,
      JSON.stringify({
        channelId,
        layers,
      }),
    );
  }

  removeLayers(channelId: string, query: LayerQueryDto) {
    this.publishClient.publish(
      REMOVE_LAYERS,
      JSON.stringify({
        channelId,
        query,
      }),
    );
  }
}
