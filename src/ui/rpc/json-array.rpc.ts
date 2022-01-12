import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function jsonArray(values: RpcOrPrimitive): Rpc {
  return {
    method: 'jsonArray',
    params: [values],
  };
}
