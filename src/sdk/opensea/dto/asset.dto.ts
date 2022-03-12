import { AssetContractDto } from "./asset-contract.dto";

export type AssetDto = Readonly<{
  asset_contract?: AssetContractDto;
  id: number;
  image_url: string;
  name: string;
  permalink: string;
  token_id: string;
  token_metadata: string;
}>
