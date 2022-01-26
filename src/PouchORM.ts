import {ClassValidate, IModel} from './types';
import ClassValidator from 'class-validator';
import {getPouchDBWithPlugins} from './helpers';
import {PouchCollection} from './PouchCollection';

const PouchDB = getPouchDBWithPlugins();

export class PouchORM {
  static databases: { [key: string]: PouchDB.Database } = {};
  static LOGGING = false;
  static VALIDATE = ClassValidate.OFF;
  static ClassValidator: typeof ClassValidator;
  static PouchDB = PouchDB;
  static registeredCollections = new Set<PouchCollection<IModel>>();

  static getDatabase(dbName: string, opts?: PouchDB.Configuration.DatabaseConfiguration): any {
    if (!PouchORM.databases[dbName]) {
      if (PouchORM.LOGGING) console.log('Creating DB: ', dbName);
      PouchORM.databases[dbName] = new PouchDB(dbName, opts);


      PouchORM.databases[dbName].changes({
        since: 'now'
      }).on('change', function (change: PouchDB.Core.ChangesResponseChange<IModel>) {
        console.log('change', change);
        PouchORM.registeredCollections.forEach((it) => {
          if (change.doc.$collectionType === it.collectionTypeName) it.onSyncChange(change);
        });
      }).on('error', function (err) {
        console.error('Sync Error', this.constructor.name, err);
      });

    }

    return PouchORM.databases[dbName];
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