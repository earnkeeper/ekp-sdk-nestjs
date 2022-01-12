import { DefaultProps } from '../default.props';
import { RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Icon(props: IconProps): UiElement {
  return {
    _type: 'Icon',
    props: props ?? {},
  };
}

export interface IconProps extends DefaultProps {
  name: UiElement | RpcOrPrimitive;
  size?: UiElement | RpcOrPrimitive;
}
