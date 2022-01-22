import { LayerDto } from '../dtos';

export const ADD_LAYERS = 'add-layers';

export interface AddLayersEvent {
  readonly clientId: string;
  readonly layers: LayerDto[];
}
