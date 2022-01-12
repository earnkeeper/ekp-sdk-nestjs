import { DefaultProps } from './default.props';

export interface UiElement {
  _type: string;
  props?: DefaultProps;
}
