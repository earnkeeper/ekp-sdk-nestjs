import { Asset } from './Asset';

// TODO: add more fields here
export interface AssetEvent {
  readonly asset: Asset;
  readonly contract_address: string;
  readonly created_date: string;
  readonly duration: string;
  readonly ending_price: string;
  readonly starting_price: string;
  readonly listing_time: string;
  readonly from_account: {
    readonly address: string;
  };
  readonly seller: {
    readonly address: string;
  };
  readonly is_private: boolean;
  readonly payment_token: {
    readonly id: number;
    readonly symbol: string;
    readonly address: string;
    readonly image_url: string;
    readonly name: string;
    readonly decimals: number;
    readonly eth_price: string;
    readonly usd_price: string;
  };
  readonly id: number;
  readonly quantity: string;
  readonly to_account?: {
    readonly address: string;
  };
  readonly event_type: string;
}
