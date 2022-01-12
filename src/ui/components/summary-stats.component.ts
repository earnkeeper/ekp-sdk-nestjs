import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function SummaryStats(props: SummaryStatsProps): UiElement {
  return {
    _type: 'SummaryStats',
    props,
  };
}

export interface SummaryStatsProps extends DefaultProps {
  title?: Rpc | string;
  rows: {
    label: Rpc | string;
    value: Rpc | string | number;
  }[];
}
