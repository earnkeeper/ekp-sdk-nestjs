import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function formatToken(value: RpcOrPrimitive): Rpc {
  return {
    method: 'formatToken',
    params: [value],
  };
}
