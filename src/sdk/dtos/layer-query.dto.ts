export interface LayerQueryDto {
  readonly id?: string;
  readonly timestamp?: {
    readonly eq?: number;
    readonly gt?: number;
    readonly gte?: number;
    readonly lt?: number;
    readonly lte?: number;
  };
  readonly tags?: string[];
}
