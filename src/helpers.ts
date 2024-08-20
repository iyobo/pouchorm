import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import { IModel } from './types';

PouchDB.plugin(PouchFind);

export function getPouchDBWithPlugins() {
  return PouchDB;
}

export function UpsertHelper<T extends IModel>(item: T) {
  return {
    merge: (existing: T) => ({...existing, ...item, _rev: existing._rev}),
    replace: (existing: T) => ({...item, _rev: existing._rev})
  };
}