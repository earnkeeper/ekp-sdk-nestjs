import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function formatAge(value: RpcOrPrimitive): Rpc {
  return {
    method: 'formatAge',
    params: [value],
  };
}
