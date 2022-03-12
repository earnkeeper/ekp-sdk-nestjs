import { AssetEventDto } from './asset-event.dto';

export type AssetEventPollDto = Readonly<{
  contractAddress?: string;
  events: AssetEventDto[];
  slug?: string;
}>;
