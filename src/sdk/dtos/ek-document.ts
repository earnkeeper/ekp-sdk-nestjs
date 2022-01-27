export abstract class EkDocument {
  constructor(properties: any) {
    Object.assign(this, properties);
  }

  readonly id: string;
  readonly updated?: number;
}
