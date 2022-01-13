import { Rpc } from '../rpc.types';

export function formatMaskAddress(value: Rpc | string): Rpc {
  return {
    method: 'formatMaskAddress',
    params: [value],
  };
}
