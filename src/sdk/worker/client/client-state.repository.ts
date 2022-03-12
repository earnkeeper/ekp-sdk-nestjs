import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import _ from 'lodash';
import { Model } from 'mongoose';
import { ClientState, ClientStateDocument } from './schemas';

@Injectable()
export class ClientStateRepository {
  constructor(
    @InjectModel(ClientState.name)
    private clientStateModel: Model<ClientStateDocument>,
  ) {}

  async delete(clientId: string): Promise<void> {
    await this.clientStateModel.findOneAndDelete({ clientId });
  }

  async findAll(): Promise<ClientState[]> {
    return this.clientStateModel.find().exec();
  }

  async save(clientState: ClientState) {
    await this.clientStateModel.findOneAndUpdate(
      { clientId: clientState.clientId },
      _.pick(clientState, ['clientId', 'received', 'state']),
      { upsert: true },
    );
  }
}
