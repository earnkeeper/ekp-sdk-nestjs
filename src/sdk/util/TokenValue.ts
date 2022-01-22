export interface TokenValue {
  readonly fiatAmount: number;
  readonly fiatSymbol: string;
  readonly tokenAmount: number;
  readonly tokenPrice: number;
  readonly tokenSymbol: string;
}
