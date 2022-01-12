import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Tile(props?: TileProps): UiElement {
  return {
    _type: 'Tile',
    props: props ?? {},
  };
}

export interface TileProps extends DefaultProps {
  align?: 'left' | 'right';
  left?: Rpc | string | UiElement;
  right?: Rpc | string | UiElement;
  size?: Rpc | 'sm' | 'lg';
  subTitle?: Rpc | UiElement | string;
  title?: Rpc | UiElement | string;
}
