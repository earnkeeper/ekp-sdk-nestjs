import { Rpc } from '../rpc.types';

export function formatDatetime(value: Rpc | string | number): Rpc {
  return {
    method: 'formatDatetime',
    params: [value],
  };
}
