import { LayerQueryDto } from '../dtos/layer-query.dto';

export const ADD_LAYERS = 'add-layers';

export interface RemoveLayersEvent {
  readonly channelId: string;
  readonly query: LayerQueryDto;
}
