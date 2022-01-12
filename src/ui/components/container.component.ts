import { DefaultProps } from '../default.props';
import { UiElement } from '../ui.element';

export function Container(props: ContainerProps = {}): UiElement {
  return {
    _type: 'Container',
    props,
  };
}

export interface ContainerProps extends DefaultProps {
  children?: UiElement[];
}
