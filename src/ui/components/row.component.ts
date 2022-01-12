import { DefaultProps } from '../default.props';
import { UiElement } from '../ui.element';

export function Row(props?: RowProps): UiElement {
  return {
    _type: 'Row',
    props,
  };
}

export interface RowProps extends DefaultProps {
  children?: UiElement[];
}
