import { CurrencyDto } from './currency.dto';

export interface ClientStateDto {
  readonly forms?: Record<string, any>;
  readonly client: {
    readonly path: string;
    readonly hiddenChains: string[];
    readonly selectedCurrency: CurrencyDto;
    readonly watchedWallets: { address: string }[];
  };
}
