import { ClientStateChangedEvent } from '../events/client-state-changed.event';

export function documents(type) {
  return `${path(type)}.*`;
}

export function path(type) {
  return `$.${collection(type)}`;
}

export function collection(type) {
  return `${process.env.EKP_PLUGIN_ID}_${type.name}`;
}

export function filterPath(event: ClientStateChangedEvent, path: string) {
  return event.state?.client?.path === path;
}
