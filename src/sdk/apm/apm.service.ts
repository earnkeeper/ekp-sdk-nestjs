import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import '@sentry/tracing';
import { TransactionContext } from '@sentry/types';
import { EkConfigService } from '../config/ek-config.service';
import { logger } from '../util/default-logger';

@Injectable()
export class ApmService {
  constructor(private configService: EkConfigService) {
    if (configService.sentryEnabled) {
      Sentry.init({
        dsn: configService.sentryDsn,
        tracesSampleRate: 1.0,
      });
    } else {
      logger.warn('No DSN configured, apm service disabled');
    }
  }

  captureError(error: any) {
    if (!this.configService.sentryEnabled) {
      return;
    }

    Sentry.captureException(error);
  }

  startTransaction(context: TransactionContext) {
    if (!this.configService.sentryEnabled) {
      return;
    }

    return Sentry.startTransaction(context);
  }
}
