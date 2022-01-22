export interface LayerDto {
  readonly collectionName: string;
  readonly id: string;
  readonly set?: any[];
  readonly patch?: { id: string; [key: string]: any }[];
  readonly tags?: string[];
  readonly timestamp?: number;
}
