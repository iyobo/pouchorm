import {ClassValidate, IModel, Sync} from './types';
import ClassValidator from 'class-validator';
import {getPouchDBWithPlugins} from './helpers';
import {PouchCollection} from './PouchCollection';

const PouchDB = getPouchDBWithPlugins();

export type ORMSyncOptions = {
  opts?: PouchDB.Configuration.DatabaseConfiguration,
  onChange?: (change: PouchDB.Replication.SyncResult<IModel>) => unknown
  onPaused?: (info: unknown) => unknown
  onActive?: (info: PouchDB.Replication.SyncResult<IModel>) => unknown
  onError?: (error: unknown) => unknown
};

export class PouchORM {
  static databases: { [key: string]: PouchDB.Database } = {};
  static LOGGING = false;
  static VALIDATE = ClassValidate.OFF;
  static ClassValidator: typeof ClassValidator;
  static PouchDB = PouchDB;

  static getDatabase(dbName: string, opts?: PouchDB.Configuration.DatabaseConfiguration): PouchDB.Database {
    if (!PouchORM.databases[dbName]) {
      if (PouchORM.LOGGING) console.log('Creating DB: ', dbName);
      PouchORM.databases[dbName] = new PouchDB(dbName, opts);

    }

    return PouchORM.databases[dbName];
  }

  /**
   * A map of active sync operations
   */
  public static activeSyncOperations: Record<string, Record<string, Sync<IModel>>> = {};

  /**
   * start Synchronizing between 2 files.
   */
  static startSync(fromDB: string, toDB: string, options: ORMSyncOptions = {}) {

    PouchORM.activeSyncOperations[fromDB] = PouchORM.activeSyncOperations[fromDB] || {};
    if (PouchORM.activeSyncOperations[fromDB][toDB]) {
      // stop any previous syncs of same names/paths
      PouchORM.activeSyncOperations[fromDB][toDB].cancel();
    }

    const localDb = PouchORM.getDatabase(fromDB);
    const remoteDB = new PouchDB(toDB);

    const realOps = {
      live: true,
      retry: true,
      ...options.opts || {}
    };

    // create new sync operation
    const syncOperation = localDb.sync(remoteDB, realOps)
      .on('change', function (change: PouchDB.Replication.SyncResult<IModel>) {
        // yo, something changed!
        if (PouchORM.LOGGING) console.log('Pulled new change: ', change);
        options.onChange?.(change);
      })
      .on('paused', function (info) {
        // replication was paused, usually because of a lost connection
        options.onPaused?.(info);
      })
      // .on('active', function (info) {
      //   // replication was resumed
      //   options.onActive?.(info);
      // })
      .on('error', function (err) {
        // totally unhandled error (shouldn't happen)
        options.onError?.(err);
      });

    // register new sync operation
    PouchORM.activeSyncOperations[fromDB][toDB] = syncOperation;
  }

  /**
   * Stop a sync operation from a given database to another
   * @param fromDB
   * @param toDB
   */
  static stopSync(fromDB: string, toDB: string) {
    PouchORM.activeSyncOperations[fromDB]?.[toDB]?.cancel();
  }

  /**
   * Stop all sync operations from a given database.
   * @param fromDB
   */
  static stopAllSync(fromDB: string) {
    Object.values(PouchORM.activeSyncOperations[fromDB] || {}).forEach(it => it.cancel());
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