import PouchDB from "pouchdb";
import PouchFind from "pouchdb-find";
import { IModel, PouchDBConstructor } from "./types";

export function getPouchDBWithPlugins(
  pouchDB: PouchDBConstructor = PouchDB as unknown as PouchDBConstructor,
): PouchDBConstructor {
  pouchDB.plugin(PouchFind);
  return pouchDB;
}

export function UpsertHelper<T extends IModel>(
  item: T,
): {
  merge: (existing: T) => T;
  replace: (existing: T) => T;
} {
  const copyItem = (fields: Partial<T>): T => {
    return Object.assign(Object.create(Object.getPrototypeOf(item)), fields);
  };

  return {
    merge: (existing: T) =>
      copyItem({ ...existing, ...item, _rev: existing._rev }),
    replace: (existing: T) => copyItem({ ...item, _rev: existing._rev }),
  };
}
