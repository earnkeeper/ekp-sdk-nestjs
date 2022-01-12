import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function formatPercent(value: RpcOrPrimitive): Rpc {
  return {
    method: 'formatPercent',
    params: [value],
  };
}
