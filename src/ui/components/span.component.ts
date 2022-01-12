import { DefaultProps } from '../default.props';
import { Rpc } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Span(props?: SpanProps): UiElement {
  return {
    _type: 'Span',
    props,
  };
}

export interface SpanProps extends DefaultProps {
  content?: Rpc | string;
}
