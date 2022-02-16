import winston from 'winston';
import { LoggerService, LogLevel } from '@nestjs/common';
import * as cluster from 'cluster';
export class DefaultLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug', // TODO: make this configurable from the enviroment
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.prettyPrint(),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.printf(
            (info) =>
              `${info.timestamp} [${cluster.default.worker?.id ?? 'primary'}] ${
                info.level
              }: ${info.message}`,
          ),
        }),
      ],
    });
  }

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, ...optionalParams);
  }
  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, ...optionalParams);
  }
  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, ...optionalParams);
  }
  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, ...optionalParams);
  }
  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.verbose(message, ...optionalParams);
  }
  setLogLevels?(levels: LogLevel[]) {
    // Not sure what to do about this one
  }
}

export const logger = new DefaultLogger();
