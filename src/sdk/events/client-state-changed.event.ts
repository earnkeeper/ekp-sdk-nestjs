export const CLIENT_STATE_CHANGED = 'client-state-changed';
import { ClientStateDto } from '../dtos';

export interface ClientStateChangedEvent {
  readonly clientId: string;
  readonly received: number;
  readonly state: ClientStateDto;
}
