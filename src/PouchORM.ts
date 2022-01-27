import {ClassValidate, IModel} from './types';
import ClassValidator from 'class-validator';
import {getPouchDBWithPlugins} from './helpers';
import {PouchCollection} from './PouchCollection';

const PouchDB = getPouchDBWithPlugins();

export type ORMSyncOptions = {
  opts?: PouchDB.Configuration.DatabaseConfiguration,
  onChange?: (change: PouchDB.Replication.SyncResult<IModel>) => unknown
  onPaused?: (info: PouchDB.Replication.SyncResult<IModel>) => unknown
  onActive?: (info: PouchDB.Replication.SyncResult<IModel>) => unknown
  onError?: (error: unknown) => unknown
};

export class PouchORM {
  static databases: { [key: string]: PouchDB.Database } = {};
  static LOGGING = false;
  static VALIDATE = ClassValidate.OFF;
  static ClassValidator: typeof ClassValidator;
  static PouchDB = PouchDB;
  static registeredCollections = new Set<PouchCollection<IModel>>();

  static getDatabase(dbName: string, opts?: PouchDB.Configuration.DatabaseConfiguration): PouchDB.Database {
    if (!PouchORM.databases[dbName]) {
      if (PouchORM.LOGGING) console.log('Creating DB: ', dbName);
      PouchORM.databases[dbName] = new PouchDB(dbName, opts);

    }

    return PouchORM.databases[dbName];
  }

  static startSync(dbName, remoteURL: string, options: ORMSyncOptions = {}) {
    const localDb = PouchORM.getDatabase(dbName);
    const remoteDB = new PouchDB(remoteURL);

    const realOps = {
      live: true,
      retry: true,
      ...options.opts || {}
    };

    localDb.sync(remoteDB, realOps).on('change', function (change: PouchDB.Replication.SyncResult<IModel>) {
      // yo, something changed!
      console.log('change', change);
      PouchORM.registeredCollections.forEach((it) => {
        if (change.change.docs[0]..$collectionType === it.collectionTypeName) it.onSyncChange(change);
      });
      options.onChange?.(change);
    }).on('paused', function (info) {
      // replication was paused, usually because of a lost connection
      options.onPaused?.(info);
    }).on('active', function (info) {
      // replication was resumed
      options.onActive?.(info);
    }).on('error', function (err) {
      // totally unhandled error (shouldn't happen)
      options.onPaused?.(err);
    });
  }


  static async clearDatabase(dbName: string) {

    const db = PouchORM.getDatabase(dbName);

    const result = await db.allDocs();
    return Promise.all(result.rows.map(function (row) {
      return db.remove(row.id, row.value.rev);
    }));
  }

  static async deleteDatabase(dbName: string) {

    const db = PouchORM.getDatabase(dbName);
    return await db.destroy();
  }

  static async registerCollection(collection: PouchCollection<IModel>) {
    this.registeredCollections.add(collection);
  }

  static getClassValidator() {
    let classValidator: typeof ClassValidator;

    try {
      classValidator = require('class-validator');
    } catch (error) {
      console.log('Error initializing validator: ', error);
    }

    return PouchORM.ClassValidator = classValidator;
  }
}