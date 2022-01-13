import { Process } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import { Job } from 'bull';
import { validate } from 'bycontract';
import _ from 'lodash';
import moment from 'moment';
import * as Rx from 'rxjs';
import { CurrencyDto } from '../socket/dtos/currency.dto';
import { LayerDto } from '../socket/dtos/layer.dto';
import { MilestoneDocumentDto } from '../socket/dtos/milestone.document.dto';
import { EventService } from '../socket/event.service';
import { ClientStateChangedEvent } from '../socket/events/client-state-changed.event';
import { ChainId } from './ChainId';
import { ChainMetadata } from './ChainMetadata';
import { chains as allChains } from './chains';
import { logger } from './default-logger';
import { logErrors } from './logErrors';

export abstract class AbstractProcessor<TContext extends BaseContext> {
  @Inject(EventService)
  protected eventService: EventService;

  abstract pipe(source: Rx.Observable<TContext>): Rx.Observable<TContext>;

  protected getMilestoneConfig(): MilestoneConfig<TContext> | undefined {
    return undefined;
  }

  protected validateEvent(
    event: ClientStateChangedEvent,
  ): Rx.Observable<TContext> {
    const clientId = validate(event.clientId, 'string');

    const selectedCurrency = validate(
      event.state?.client.selectedCurrency,
      'object',
    );

    const watchedWallets = validate(
      event.state?.client.watchedWallets,
      'Array.<object>',
    );

    const forms = event.state.forms;

    const hiddenChains =
      validate(event.state?.client.hiddenChains, 'Array.<string>=') ?? [];

    const chains = _.chain(allChains)
      .filter((it) => !hiddenChains.includes(it.id))
      .value();

    const chainIds = chains.map((it) => it.id);

    return Rx.from([
      <TContext>{
        chainIds,
        chains,
        clientId,
        selectedCurrency,
        forms,
        watchedAddresses: watchedWallets
          .filter((it: { hidden: boolean }) => it.hidden !== true)
          .map((it: { address: string }) => it.address.toLowerCase()),
      },
    ]);
  }

  @Process()
  async handleClientStateChangedEvent(job: Job<ClientStateChangedEvent>) {
    const validatedContext = this.validateEvent(job.data);

    const pipedObservable = this.pipe(validatedContext);

    logger.log(`Handling job ${job.queue.name}`);

    const started = moment().unix();

    await Rx.firstValueFrom(pipedObservable.pipe(logErrors()));

    logger.log(
      `Job complete ${job.queue.name} in ${moment().unix() - started} seconds`,
    );
  }

  protected removeMilestones() {
    return Rx.tap((context: TContext) => {
      const config = this.getMilestoneConfig();

      if (!config) {
        return;
      }

      const removeMilestonesQuery = {
        id: config.collectionName,
      };

      this.eventService.removeLayers(context.clientId, removeMilestonesQuery);
    });
  }

  protected emitMilestones() {
    return Rx.tap((context: TContext) => {
      const config = this.getMilestoneConfig();

      if (!config) {
        return;
      }

      const layers = this.getMilestoneLayers(context, config);

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private getMilestoneLayers(
    context: TContext,
    config: MilestoneConfig<TContext>,
  ) {
    const documents: MilestoneDocumentDto[] = config.wrappers.map(
      (wrapper: MilestoneDocumentWrapper<TContext>, i: number) => {
        const targetDocuments = wrapper.items(context);

        const milestoneDocument: MilestoneDocumentDto = {
          id: `${i}`,
          status: !targetDocuments ? 'progressing' : 'complete',
          label: !targetDocuments
            ? wrapper.progressing(context)
            : wrapper.complete(targetDocuments),
        };

        return milestoneDocument;
      },
    );

    const layers: LayerDto[] = [
      {
        id: config.collectionName,
        collectionName: config.collectionName,
        set: documents,
      },
    ];

    return layers;
  }
}

export interface BaseContext {
  readonly chainIds: ChainId[];
  readonly chains: ChainMetadata[];
  readonly clientId: string;
  readonly selectedCurrency: CurrencyDto;
  readonly watchedAddresses: string[];
  readonly forms?: Record<string, any>;
}

export interface MilestoneDocumentWrapper<TContext extends BaseContext> {
  items: (context: TContext) => any;
  progressing: (context: TContext) => string;
  complete: (documents: any) => string;
}

export interface MilestoneConfig<TContext extends BaseContext> {
  readonly collectionName: string;
  readonly showEmptyWhen: (context: TContext) => boolean;
  readonly wrappers: MilestoneDocumentWrapper<TContext>[];
}

export function milestoneConfig<TContext extends BaseContext>(
  collectionName: string,
  showEmptyWhen: (context: TContext) => boolean,
  ...wrappers: MilestoneDocumentWrapper<TContext>[]
): MilestoneConfig<TContext> {
  return {
    collectionName,
    showEmptyWhen,
    wrappers,
  };
}
