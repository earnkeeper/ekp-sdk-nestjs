import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function sum(values: RpcOrPrimitive): Rpc {
  return {
    method: 'sum',
    params: [values],
  };
}
