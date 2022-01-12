import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Link(props: LinkProps): UiElement {
  return {
    _type: 'Link',
    props,
  };
}

export interface LinkProps extends DefaultProps {
  content: Rpc | string;
  href: Rpc | string;
  external?: boolean;
}
