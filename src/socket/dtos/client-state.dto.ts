import { CurrencyDto } from './currency.dto';

export interface ClientStateDto {
  readonly forms?: Record<string, any>;
  readonly client: {
    readonly lastTimestamp?: number;
    readonly selectedCurrency: CurrencyDto;
    readonly watchedWallets: { address: string }[];
    readonly hiddenChains: string[];
  };
}
