import { Rpc, RpcOrPrimitive } from '../rpc.types';

export function navigate(
  location: RpcOrPrimitive,
  newTab: RpcOrPrimitive = false,
  external: RpcOrPrimitive = false,
): Rpc {
  return {
    method: 'navigate',
    params: [location, newTab, external],
  };
}
