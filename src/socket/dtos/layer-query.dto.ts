export const REMOVE_LAYERS = 'remove-layers';

export interface LayerQueryDto {
  readonly id?: string;
  readonly timestamp?: {
    readonly before: number;
    readonly after: number;
  };
  readonly tags?: string[];
}
