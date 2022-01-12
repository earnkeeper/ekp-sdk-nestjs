import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function formatTimeToNow(value: RpcOrPrimitive): Rpc {
  return {
    method: 'formatTimeToNow',
    params: [value],
  };
}
