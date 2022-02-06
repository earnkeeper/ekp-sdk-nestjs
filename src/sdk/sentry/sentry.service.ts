import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { TransactionContext } from '@sentry/types';
import { EkConfigService } from '../config/ek-config.service';

@Injectable()
export class SentryService {
  constructor(private configService: EkConfigService) {
    if (configService.sentryEnabled) {
      Sentry.init({
        dsn: configService.sentryDsn,
        tracesSampleRate: 1.0,
      });
    }
  }

  captureError(error: any) {
    if (!this.configService.sentryEnabled) {
      return;
    }
    Sentry.captureException(error);
  }

  startTransaction(context: TransactionContext) {
    return Sentry.startTransaction(context);
  }
}
