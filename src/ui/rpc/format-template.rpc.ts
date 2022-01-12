import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function formatTemplate(
  value: RpcOrPrimitive,
  scope: Record<string, RpcOrPrimitive>,
): Rpc {
  return {
    method: 'formatTemplate',
    params: [value, scope],
  };
}
