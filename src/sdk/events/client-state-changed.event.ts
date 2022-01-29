export const CLIENT_STATE_CHANGED = 'client-state-changed';
import { validate } from 'bycontract';
import { ClientStateDto } from '../dtos';

export interface ClientStateChangedEvent {
  readonly clientId: string;
  readonly received: number;
  readonly state: ClientStateDto;
}

export function parseClientAddresses(event: ClientStateChangedEvent) {
  validate(event, 'object');

  const watchedWallets = event.state.client.watchedWallets;

  if (!Array.isArray(watchedWallets)) {
    return [];
  }

  return watchedWallets
    .map((wallet) => wallet.address)
    .filter((address) => !!address);
}

export function parseCurrency(event: ClientStateChangedEvent) {
  validate(event, 'object');

  return event.state?.client?.selectedCurrency;
}
