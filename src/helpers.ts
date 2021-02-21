import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';

PouchDB.plugin(PouchFind);

export function getPouchDBWithPlugins() {
  return PouchDB;
}

export function UpsertHelper(item: any) {
  return {
    merge: (existing: any) => ({...existing, ...item, _rev: existing._rev}),
    replace: (existing: any) => ({...item, _rev: existing._rev})
  };
}