import { ClientStateChangedEvent } from '@earnkeeper/ekp-sdk';
import { ClientService } from '../worker/client/client.service';

export abstract class AbstractController {
  constructor(protected clientService: ClientService) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    clientService.clientStateEvents$.subscribe((event) => {
      this.onClientStateChanged(event);
    });
  }

  abstract onClientStateChanged(event: ClientStateChangedEvent): Promise<void>;
}
