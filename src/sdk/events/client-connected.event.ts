export const CLIENT_CONNECTED = 'client-connected';
export const CLIENT_DISCONNECTED = 'client-disconnected';

export interface ClientConnectedEvent {
  readonly clientId: string;
}

export interface ClientDisconnectedEvent {
  readonly clientId: string;
}
