export interface CoinPrice {
  id: string;
  coinId: string;
  fiatId: string;
  price: number;
  timestamp?: number;
}
