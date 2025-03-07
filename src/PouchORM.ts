import { PouchCollection } from './PouchCollection';
import { ClassValidate, IModel, Sync } from './types';
import ClassValidator from 'class-validator';
import { getPouchDBWithPlugins } from './helpers';

const PouchDB = getPouchDBWithPlugins();

export type ORMSyncOptions = {
  opts?: PouchDB.Configuration.DatabaseConfiguration,
  onChange?: (change: PouchDB.Replication.SyncResult<IModel>) => unknown
  onPaused?: (info: unknown) => unknown
  onActive?: (info: PouchDB.Replication.SyncResult<IModel>) => unknown
  onError?: (error: unknown) => unknown
};

export class PouchORM {
  private static databases: Record<string, {
    db: PouchDB.Database,
    changeListener?: PouchDB.Core.Changes<any>,
    collectionInstances: Set<PouchCollection<any>>
  }> = {};
  static LOGGING = false;
  static VALIDATE = ClassValidate.OFF;
  static ClassValidator: typeof ClassValidator;
  static PouchDB = PouchDB;

  /**
   * Set this to enable user change logging with this id for each upsert
   */
  static userId: string;

  static adapter: string;

  /**
    Prepares the given collection for the given database.
  */
  static ensureDatabase(dbName: string, pouchCollection: PouchCollection<any>, opts?: PouchDB.Configuration.DatabaseConfiguration): PouchDB.Database {

    // ensure the database exists
    if (!PouchORM.databases[dbName]) {
      if (PouchORM.LOGGING) console.log('PouchORM Registering DB: ', dbName);

      // Creates or loads the DB
      const db = new PouchDB(dbName, {adapter: PouchORM.adapter, ...opts});
      PouchORM.databases[dbName] = {db, changeListener: undefined, collectionInstances: new Set()};
    }

    // Ensure the asking collection is related to this DB
    PouchORM.databases[dbName].collectionInstances.add(pouchCollection);

    // If there is no change listener for the DB, start one.
    // This will make it so all related collections get informed when the db changes.
    PouchORM.beginChangeListener(dbName)

    return PouchORM.databases[dbName].db;
  }

  private static createChangeListener(dbName: string) {
    const db = PouchORM.databases[dbName].db;
    if (!db) throw new Error(`Cannot create changeListener for non-existent DB: '${dbName}'`);

    return db.changes<IModel>({
      live: true,
      since: 'now',
      include_docs: true,
    }).on('change', function (change) {

      PouchORM.databases[dbName].collectionInstances.forEach(collectionInstance => {
        if(!collectionInstance || change.doc.$collectionType !== collectionInstance.collectionTypeName) return

        if (change.deleted) {
          void collectionInstance.onChangeDeleted(change.doc);
        } else {
          void collectionInstance.onChangeUpserted(change.doc);
        }
      });

    }).on('error', function (error) {
      console.error(`Change listener error for db "${dbName}"`, error);

      PouchORM.databases[dbName].collectionInstances.forEach(collectionInstance => {
        void collectionInstance.onChangeError(error);
      });
    });
  }

  /**
  If there is no change listener for the DB, start one.
  This will make it so all related collections get informed when the db changes.
  */
  static beginChangeListener(dbName: string) {
    if (!PouchORM.databases[dbName].changeListener) {
      PouchORM.databases[dbName].changeListener = PouchORM.createChangeListener(dbName);
    }
  }

  /**
   Stop user oplog handlers for the database
  */
  public static stopChangeListener(dbName: string) {
    PouchORM.databases[dbName].changeListener?.cancel()
    PouchORM.databases[dbName].changeListener = undefined
  }

  /**
   PouchORM can help you do some basic audit logging by passing in a userId to attach to all changes that originate from this instance.
  */
  public static setUser(userId: string) {
    PouchORM.userId = userId;
  }

  /**
   * A map of active sync operations between databases
   * from -> to -> SyncOp reference
   */
  public static activeSyncOperations: Record<string, Record<string, Sync<IModel>>> = {};

  /**
   * start Synchronizing between 2 Databases. Can be files or urls to remote databases.
   */
  static startSync(fromDB: string, toDB: string, options: ORMSyncOptions = {}) {

    PouchORM.activeSyncOperations[fromDB] = PouchORM.activeSyncOperations[fromDB] || {};
    if (PouchORM.activeSyncOperations[fromDB][toDB]) {
      // stop any previous syncs of same names/paths
      PouchORM.activeSyncOperations[fromDB][toDB].cancel();
    }

    const localDb = PouchORM.databases[fromDB]?.db;
    if (!localDb) throw new Error(`sourceDB does not exist: ${fromDB}`);

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
        if (PouchORM.LOGGING) console.log('PouchORM Pulled new change: ', change);
        options.onChange?.(change);
      })
      .on('paused', function (info) {
        // replication was paused, usually because of a lost connection
        options.onPaused?.(info);
      })
      .on('active', function (info) {
        // replication was resumed
        options.onActive?.(info);
      })
      .on('error', function (err) {
        // totally unhandled error (shouldn't happen)
        options.onError?.(err);
      });

    // register new sync operation
    PouchORM.activeSyncOperations[fromDB][toDB] = syncOperation;
  }

  /**
   * Stop one or all sync operations from a db by name.
   * @param fromDB
   * @param toDB - if no destination DB specified, stop all sync ops for DB.
   */
  static stopSync(fromDB: string, toDB?: string) {
    if (toDB) {
      // close connection to that db
      PouchORM.activeSyncOperations[fromDB]?.[toDB]?.cancel();
    } else {
      // close all connections
      Object.values(PouchORM.activeSyncOperations[fromDB] || {}).forEach(it => it.cancel());
    }
  }

  /**
   * deletes everything in a database
   * @param dbName
   */
  static async clearDatabase(dbName: string) {

    const db = PouchORM.databases[dbName]?.db;
    if (!db) throw new Error(`Database does not exist: ${dbName}`);

    const result = await db.allDocs();
    const deletedDocs = result.rows.map(row => {
      return {_id: row.id, _rev: row.value.rev, _deleted: true};
    });
    return await db.bulkDocs(deletedDocs);

    // Leave as comment for debug
    // return Promise.all(result.rows.map(function (row) {
    //   return db.remove(row.id, row.value.rev);
    // }));
  }

  static async deleteDatabase(dbName: string) {

    const dbSet = PouchORM.databases[dbName];
    if (!dbSet) throw new Error(`Database does not exist: ${dbName}`);

    // First stop DB change listener
    dbSet.changeListener.cancel();

    // then stop any active syncs (be it remote or local)
    if (PouchORM.activeSyncOperations[dbName]) {
      const syncs = Object.values(PouchORM.activeSyncOperations[dbName]);
      syncs.forEach(it => it.cancel());
      delete PouchORM.activeSyncOperations[dbName];
    }

    // then destroy the DB
    const res = await dbSet.db.destroy();

    // lastly, unregister db from PouchORM
    delete PouchORM.databases[dbName];

    return res;
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
