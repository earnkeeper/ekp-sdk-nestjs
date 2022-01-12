export const UPDATE_METADATA = 'update-metadata';

export interface UpdateMetadataEvent {
  readonly clientId: string;
  readonly pluginId: string;
  readonly pluginName: string;
}
