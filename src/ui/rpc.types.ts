export type RpcOrPrimitive =
  | Rpc
  | string
  | number
  | boolean
  | string[]
  | number[];

export interface Rpc {
  method: string;
  params?: any[];
}

export type When =
  | {
      not: Rpc | string | boolean;
    }
  | Rpc
  | string
  | boolean;
