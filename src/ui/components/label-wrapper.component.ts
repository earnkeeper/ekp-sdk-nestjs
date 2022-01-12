import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function LabelWrapper(props: LabelWrapperProps): UiElement {
  return {
    _type: 'LabelWrapper',
    props,
  };
}

export interface LabelWrapperProps extends DefaultProps {
  label: Rpc | string;
  child: UiElement;
  feedbackText?: Rpc | string;
}
