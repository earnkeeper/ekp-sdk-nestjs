import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import _ from 'lodash';
import moment from 'moment';
import { Model } from 'mongoose';
import { CoingeckoService } from '../coingecko/coingecko.service';
import { ChainId } from '../util';
import { FiatPrice } from './schema';

@Injectable()
export class PriceService {
  constructor(
    private coinGeckoService: CoingeckoService,
    @InjectModel(FiatPrice.name)
    public fiatPriceModel: Model<FiatPrice>,
  ) {}

  async dailyFiatPricesOf(
    chainId: ChainId,
    tokenAddress: string,
    fiatId: string,
  ): Promise<FiatPrice[]> {
    const dbModels = await this.fiatPriceModel
      .find({ chainId, tokenAddress, fiatId })
      .exec();

    const maxTimestamp = _.chain(dbModels)
      .maxBy('timestamp')
      .defaults({ timestamp: 0 })
      .get('timestamp')
      .value();

    const nowMoment = moment();

    if (nowMoment.utc().startOf('day').isSame(moment.unix(maxTimestamp))) {
      return dbModels;
    }

    const coinId = this.coinGeckoService.coinIdOf(chainId, tokenAddress);

    const marketResult = await this.coinGeckoService.fetchMarketChart(
      coinId,
      fiatId,
      maxTimestamp,
      nowMoment.unix(),
    );

    if (marketResult.length === 0) {
      return dbModels;
    }

    const newModels = _.chain(marketResult)
      .sortBy('timestamp')
      .uniqBy((result) =>
        moment.unix(result.timestamp).utc().startOf('day').unix(),
      )
      .map((result) => ({
        id: result.id,
        chainId,
        fiatId,
        tokenAddress,
        timestamp: moment.unix(result.timestamp).utc().startOf('day').unix(),
        price: result.price,
        source: 'coingecko',
        sourceId: coinId,
      }))
      .value();

    await this.fiatPriceModel.bulkWrite(
      newModels.map((model) => ({
        updateOne: {
          filter: { id: model.id },
          update: { $set: model },
          upsert: true,
        },
      })),
    );

    return [...dbModels, ...newModels];
  }
}
