import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function PriceLink(props?: PriceLinkProps): UiElement {
  return {
    _type: 'PriceLink',
    props,
  };
}
export interface PriceLinkProps extends DefaultProps {
  readonly price: Rpc | string;
  readonly href?: Rpc | string;
  readonly label: Rpc | string;
}
