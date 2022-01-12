import { DefaultProps } from '../default.props';
import { UiElement } from '../ui.element';

export function Card(props?: CardProps): UiElement {
  return {
    _type: 'Card',
    props,
  };
}

export interface CardProps extends DefaultProps {
  children: UiElement[];
}
