# Migrating to PouchORM 5

PouchORM 5 corrects collection identity, public return types, validation inheritance, bulk writes, synchronization cleanup, and package declarations. These changes require updates in applications using PouchORM 4.

## Install the PouchDB peer dependency

PouchDB is now a peer dependency so your application and PouchORM use one constructor and one plugin registry.

```sh
npm install pouchorm@^5 pouchdb@^9
```

Install `class-validator` separately if you enable validation:

```sh
npm install class-validator@^0.14.4
```

Register it once before saving validated models:

```ts
import * as classValidator from "class-validator";
import { PouchORM } from "pouchorm";

PouchORM.useClassValidator(classValidator);
```

Node.js 20 or newer is required for Node applications.

## Give every collection a stable name

PouchORM 4 used the JavaScript class name as `$collectionType`. Production minifiers can change that name and make saved documents disappear from collection queries.

PouchORM 5 requires a constructor options object:

```ts
// PouchORM 4
class People extends PouchCollection<Person> {}
const people = new People("app-data", undefined, ClassValidate.ON_AND_REJECT);

// PouchORM 5
class People extends PouchCollection<Person> {
  constructor() {
    super({
      database: "app-data",
      collection: "People",
      validate: ClassValidate.ON_AND_REJECT,
    });
  }
}
const people = new People();
```

To keep reading existing data, set `collection` to the exact class name stored by PouchORM 4. In this example that value is `People`. Once it is an explicit string, minification and later class renames cannot change it.

If production builds have already stored several minified names, migrate those documents to one chosen `$collectionType` before using only the new name.

## Handle missing query results

The declarations now match the existing runtime behavior:

```ts
const person = await people.findById(id); // Person | null
const first = await people.findOne({ name: "Ada" }); // Person | null
```

Check for `null`, or use `findByIdOrFail` and `findOneOrFail` when absence should throw.

## Choose validation inheritance explicitly

Collections now default to `ClassValidate.INHERIT`.

- `INHERIT` follows `PouchORM.VALIDATE`.
- `OFF` always disables validation for that collection.
- The other modes retain their PouchORM 4 behavior.

`bulkUpsert` now validates documents as well. Validation requires `class-validator` to be installed and registered.

Direct access to `PouchORM.ClassValidator` has been removed. Register the module with `useClassValidator` and use the documented validation settings.

## Update bulk-write handling

`bulkUpsert` now performs the same work as `upsert` for every item. It looks up current revisions, validates, retries conflicts, and returns saved documents:

```ts
const saved: Person[] = await people.bulkUpsert(items);
```

It no longer returns raw PouchDB bulk responses. `bulkRemove` still returns one PouchDB result per item, but it no longer adds `_deleted` to the objects supplied by the caller.

## Update synchronization options

The nested PouchDB settings property changed from `opts` to `options`:

```ts
const operation = PouchORM.startSync("local", remoteUrl, {
  options: { batch_size: 100 },
  onError(error) {
    console.error(error);
  },
});
```

`startSync` now returns its handle. `stopSync` returns the number of operations stopped. The mutable `activeSyncOperations` object was removed; use `getActiveSync(from, to)` when you need the registered handle.

Deleting a database now cancels synchronization where that database is either the source or destination.

## Update renamed public properties

| PouchORM 4           | PouchORM 5       |
| -------------------- | ---------------- |
| `_state`             | `state`          |
| `_indexes`           | `indexes`        |
| `collectionTypeName` | `collectionName` |

`removeIndex` and `removeById` now return a boolean indicating whether they found something to remove.

## PouchDB constructors and types

Add plugins to `PouchORM.PouchDB`, which is the same PouchDB constructor supplied by the peer dependency:

```ts
PouchORM.PouchDB.plugin(plugin);
```

For a custom PouchDB build, call `PouchORM.usePouchDB(constructor)` before opening a database.

PouchORM's declarations no longer rely on the global `PouchDB` namespace. Applications do not need `@types/pouchdb` merely to consume PouchORM's declarations.

## Clearing data

`clearDatabase` now preserves PouchDB design documents and indexes. It removes application documents and leaves existing collections ready for queries and sorted results.
