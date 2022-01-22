import { LayerQueryDto } from '../dtos/layer-query.dto';

export const REMOVE_LAYERS = 'remove-layers';

export interface RemoveLayersEvent {
  readonly clientId: string;
  readonly query: LayerQueryDto;
}
