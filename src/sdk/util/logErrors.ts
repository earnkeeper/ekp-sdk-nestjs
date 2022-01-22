import * as Rx from 'rxjs';
import { logger } from './default-logger';

export function logErrors() {
  return Rx.catchError((error) => {
    logger.error(error);
    console.log(error.stack);
    return Rx.of();
  });
}
