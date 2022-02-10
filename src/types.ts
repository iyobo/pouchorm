export interface IModel {
  _id?: string;
  _rev?: string;
  _deleted?: boolean;
  $timestamp?: number;
  $collectionType?: string; // Holds what type of object this is
  /**
   * Will automatically be filled with PouchORM.userId on upserts
   */
  $by?: string;
}

export enum CollectionState {
  NEW,
  LOADING,
  READY,
}

export enum ClassValidate {
  OFF,
  ON,
  ON_AND_LOG,
  ON_AND_REJECT
}

export abstract class PouchModel<T> implements IModel {
  constructor(item: T) {
    Object.assign(this, item);
  }

  _id?: string;
  _rev?: string;
  _deleted?: boolean;
  $timestamp?: number;
  $collectionType?: string;
  /**
   * Will automatically be filled with PouchORM.userId on upserts
   */
  $by?: string;
}

export type SyncResult<IModel> = PouchDB.Replication.SyncResult<IModel>;
export type Sync<IModel> = PouchDB.Replication.Sync<IModel>;