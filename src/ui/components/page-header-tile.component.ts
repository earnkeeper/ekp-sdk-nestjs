import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function PageHeaderTile(props: PageHeaderTileProps): UiElement {
  return {
    _type: 'PageHeaderTile',
    props,
  };
}

export interface PageHeaderTileProps extends DefaultProps {
  image?: Rpc | string;
  icon?: Rpc | string;
  returnLocation?: Rpc | string;
  subTitle?: Rpc | string;
  title: Rpc | string;
}
