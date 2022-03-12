import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';
import { WORKER_QUEUE } from '../../util';

@Injectable()
export class WorkerService {
  constructor(@InjectQueue(WORKER_QUEUE) private queue: Queue) {}

  async addJob(jobName: string, params?: any, options?: JobOptions) {
    await this.queue.add(jobName, params, options);
  }
}
