export const ADD_LAYERS = 'add-layers';
import { LayerDto } from '../dtos';

export interface AddLayersEvent {
  readonly channelId: string;
  readonly layers: LayerDto[];
}
