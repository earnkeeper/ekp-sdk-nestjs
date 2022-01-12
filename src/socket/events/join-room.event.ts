export const JOIN_ROOM = 'join-room';

export interface JoinRoomEvent {
  readonly clientId: string;
  readonly roomName: string;
}
