import { NestFactory } from '@nestjs/core';
import * as cluster from 'cluster';
import * as os from 'os';

export async function runCluster(socketApp: any, workerApp: any) {
  const bootstrap = async () => {
    if (cluster.default.isPrimary) {
      const app = await NestFactory.create(socketApp, { logger: false });

      await app.listen(3001);
    } else {
      const app = await NestFactory.create(workerApp, { logger: false });

      await app.init();
    }
  };

  Cluster.register(16, bootstrap);
}

class Cluster {
  static register(workers: number, callback: () => Promise<void>): void {
    const cpus = os.cpus().length;

    if (workers > cpus) workers = cpus;

    if (cluster.default.isPrimary) {
      //ensure workers exit cleanly
      process.on('SIGINT', function () {
        console.log('Cluster shutting down...');
        for (const id in cluster.default.workers) {
          cluster.default.workers[id].kill();
        }
        // exit the master process
        process.exit(0);
      });

      for (let i = 0; i < workers; i++) {
        cluster.default.fork();
      }

      // cluster.default.on('online', function (worker) {
      //   console.log('Worker %s is online', worker.process.pid);
      // });

      cluster.default.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting`);
        cluster.default.fork();
      });
    }
    callback();
  }
}
