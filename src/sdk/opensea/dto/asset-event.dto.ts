import { AssetDto } from './asset.dto';
import { AssetContractDto } from './asset-contract.dto';

export type AssetEventDto = Readonly<{
  asset: AssetDto;
  contract_address: string;
  created_date: string;
  duration: string;
  ending_price: string;
  event_type: string;
  from_account: Readonly<{
    address: string;
  }>;
  id: number;
  is_private: boolean;
  listing_time: string;
  payment_token: Readonly<{
    id: number;
    symbol: string;
    address: string;
    image_url: string;
    name: string;
    decimals: number;
    eth_price: string;
    usd_price: string;
  }>;
  quantity: string;
  seller: Readonly<{
    address: string;
  }>;
  starting_price: string;
  to_account?: Readonly<{
    address: string;
  }>;
}>;
