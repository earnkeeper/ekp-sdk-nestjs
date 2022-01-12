import { DefaultProps } from '../default.props';
import { UiElement } from '../ui.element';

export function Fragment(props: FragmentProps = {}): UiElement {
  return {
    _type: 'Fragment',
    props,
  };
}

export interface FragmentProps extends DefaultProps {
  children?: UiElement[];
}
