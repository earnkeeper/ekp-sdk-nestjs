import { DefaultProps } from '../default.props';
import { RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function MilestoneWrapper(props: MilestoneWrapperProps): UiElement {
  return {
    _type: 'MilestoneWrapper',
    props,
  };
}

export interface MilestoneWrapperProps extends DefaultProps {
  milestones: RpcOrPrimitive;
  child: UiElement;
}
