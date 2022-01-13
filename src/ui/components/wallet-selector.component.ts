import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function WalletSelector(props: WalletSelectorProps = {}): UiElement {
  return {
    _type: 'WalletSelector',
    props,
  };
}

export interface WalletSelectorProps extends DefaultProps {
  hideChains?: Rpc | boolean;
}
