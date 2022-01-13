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
  cell?: UiElement;
  filterable?: RpcOrPrimitive;
  grow?: Rpc | number;
  id: RpcOrPrimitive;
  label?: Rpc | string;
  name?: RpcOrPrimitive;
  right?: RpcOrPrimitive;
  sortable?: RpcOrPrimitive;
  value?: RpcOrPrimitive;
  width?: Rpc | number | string;
}
