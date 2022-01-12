import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Input(props: InputProps): UiElement {
  return {
    _type: 'Input',
    props,
  };
}

export interface InputProps extends DefaultProps {
  label: string | Rpc;
  value: string | Rpc;
}
