import {
  ClientConnectedEvent,
  ClientDisconnectedEvent,
  ClientStateChangedEvent,
} from '@earnkeeper/ekp-sdk';
import { ClientService } from '../worker/client/client.service';

export abstract class AbstractController {
  constructor(protected clientService: ClientService) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    clientService.clientConnectedEvents$.subscribe((event) => {
      this.onClientConnected(event);
    });
    clientService.clientStateEvents$.subscribe((event) => {
      this.onClientStateChanged(event);
    });
    clientService.clientDisconnectedEvents$.subscribe((event) => {
      this.onClientDisconnected(event);
    });
  }

  abstract onClientConnected(event: ClientConnectedEvent): Promise<void>;
  abstract onClientStateChanged(event: ClientStateChangedEvent): Promise<void>;
  abstract onClientDisconnected(event: ClientDisconnectedEvent): Promise<void>;
}
