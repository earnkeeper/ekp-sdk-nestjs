import { DefaultProps } from '../default.props';
import { Rpc, RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Datatable(props: DatatableProps): UiElement {
  return {
    _type: 'Datatable',
    props,
  };
}

export interface DatatableProps extends DefaultProps {
  columns: DatatableColumn[];
  data: RpcOrPrimitive;
  defaultSortAsc?: RpcOrPrimitive;
  defaultSortFieldId?: RpcOrPrimitive;
  filterable?: RpcOrPrimitive;
  pagination?: RpcOrPrimitive;
  paginationPerPage?: RpcOrPrimitive;
  onRowClicked?: Rpc;
}

export interface DatatableColumn {
  id: RpcOrPrimitive;
  filterable?: RpcOrPrimitive;
  grow?: Rpc | number;
  name?: RpcOrPrimitive;
  right?: RpcOrPrimitive;
  sortable?: RpcOrPrimitive;
  width?: Rpc | number | string;
  value?: RpcOrPrimitive;
  cell?: UiElement;
}
