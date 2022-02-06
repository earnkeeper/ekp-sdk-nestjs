export const CLIENT_STATE_CHANGED = 'client-state-changed';
import { validate } from 'bycontract';
import { ClientStateDto } from '../dtos';
import { chains } from '../util/chain/chains';
import { ChainMetadata } from '../util/chain/ChainMetadata';
import _ from 'lodash';

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

export function parseSelectedChains(
  event: ClientStateChangedEvent,
): ChainMetadata[] {
  validate(event, 'object');

  if (!Array.isArray(event.state?.client?.hiddenChains)) {
    return Object.values(chains);
  }

  return _.chain(chains)
    .values()
    .filter((chain) => !event.state.client.hiddenChains.includes(chain.id))
    .value();
}

export function parseSelectedWalletAddresses(
  event: ClientStateChangedEvent,
): string[] {
  validate(event, 'object');

  if (!Array.isArray(event.state?.client?.watchedWallets)) {
    return [];
  }

  return _.chain(event.state?.client?.watchedWallets)
    .filter((wallet) => wallet.hidden !== true)
    .map((wallet) => wallet.address)
    .value();
}
