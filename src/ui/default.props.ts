import { Rpc, RpcOrPrimitive, When } from './rpc.types';

export interface DefaultProps {
  className?: string;
  context?: RpcOrPrimitive;
  when?: When;
  tooltip?: RpcOrPrimitive;
}
