---
id: api-reference
title: API reference
sidebar_label: API reference
hide_title: true
description: Public classes, methods, options, and return types in PouchORM 5.
---

# API reference

This reference describes the public PouchORM 5 exports.

## Models

### `IModel<IDType>`

Extend this interface when defining a model. `IDType` defaults to `string` and must be a string type.

```ts
interface IModel<IDType extends string = string> {
  _id?: IDType;
  _rev?: string;
  _deleted?: boolean;
  $timestamp?: number;
  $collectionType?: string;
  $by?: string;
}
```

### `PouchModel<T, IDType>`

Extend this class when you need a class instance, including when you use `class-validator` decorators. Its constructor copies the supplied fields onto the instance.

```ts
class Person extends PouchModel<Person> {
  name!: string;
}

const person = new Person({ name: "Ada" });
```

## `PouchCollection<T, IDType>`

Extend this class to define a collection. `T` must extend `IModel<IDType>`.

### Constructor

```ts
new Collection({
  database: string,
  collection: string,
  pouch?: PouchDatabaseConfiguration,
  validate?: ClassValidate
})
```

- `database` identifies the PouchDB database.
- `collection` is the stable value saved in `$collectionType`.
- `pouch` is passed to PouchDB the first time the named database is opened.
- `validate` defaults to `ClassValidate.INHERIT`.

Both names must be non-empty. PouchORM does not derive the collection name from the JavaScript class name.

### Properties

#### `databaseName`

The database name supplied to the constructor.

#### `collectionName`

The stable name saved in `$collectionType` and added to queries.

#### `db`

The underlying database. Its public type is `PouchDatabase<T>`, a self-contained description of the PouchDB methods exposed by PouchORM.

#### `validate`

The collection's validation mode.

#### `idGenerator`

```ts
(item?: T) => IDType | Promise<IDType>;
```

An optional ID generator. PouchORM uses a UUID when it is absent.

#### `state`

The current `CollectionState`: `NEW`, `LOADING`, or `READY`.

#### `indexes`

The indexes added through this collection instance.

### Initialization

#### `beforeInit()`

Override this method to add collection-specific indexes before the built-in indexes.

```ts
async beforeInit(): Promise<void> {
  await this.addIndex(["createdAt"], "items-by-created-at");
}
```

#### `afterInit()`

Override this method for work that must happen after every index is ready.

#### `checkInit()`

Waits for initialization. Collection operations call it automatically. Concurrent operations share the same initialization, and a failed initialization can be retried.

### Indexes

#### `addIndex(fields, name?)`

```ts
addIndex(fields: Array<keyof T>, name?: string): Promise<PouchIndexResponse>
```

Creates a Mango index beginning with `$collectionType`. The supplied array is not changed.

#### `removeIndex(name)`

```ts
removeIndex(name: string): Promise<boolean>
```

Removes an index recorded by this collection instance. Returns `false` when the name is unknown.

### Queries

Selectors use Mango query syntax. PouchORM adds the collection name without changing the selector you pass.

#### `find(selector?, options?)`

```ts
find(
  selector?: Partial<T> | Record<string, unknown>,
  options?: {
    sort?: CollectionSort<T>;
    limit?: number;
  }
): Promise<T[]>
```

Returns matching documents. Sort entries may be field names or direction objects such as `{ createdAt: "desc" }`. PouchDB requires every field in a multi-field sort to use the same direction. PouchORM checks that requirement and adds `$collectionType` to the sort so it matches the indexes created by the collection.

#### `findOne(selector)`

```ts
findOne(selector: Partial<T> | Record<string, unknown>): Promise<T | null>
```

Returns the first match or `null`.

#### `findOrFail(selector?, options?)`

Returns matching documents and throws when there are none.

#### `findOneOrFail(selector)`

Returns the first match and throws when there is none.

#### `findById(id)`

```ts
findById(id: IDType): Promise<T | null>
```

Looks up an ID directly and returns it only when its `$collectionType` matches this collection.

#### `findByIdOrFail(id)`

Returns the matching document and throws when it is missing or belongs to another collection.

### Writes

#### `upsert(item, delta?)`

```ts
upsert(item: T, delta?: (existing: T) => T): Promise<T>
```

Creates a document or updates the document with the same `_id`. By default, an update replaces its stored fields while preserving the latest revision. Pass `UpsertHelper(item).merge` or another function to merge with the stored document.

PouchORM does not change the object you pass. It generates an ID when needed, validates the candidate document, adds its metadata, and returns the saved document. Revision conflicts are retried up to five times.

#### `bulkUpsert(items)`

```ts
bulkUpsert(items: T[]): Promise<T[]>
```

Calls the same upsert path for every document. ID generation, validation, update lookup, and conflict handling therefore match `upsert`. The method returns the saved documents.

Items are processed in input order. The operation is not transactional: if a later item fails, earlier items remain saved.

#### `remove(item)`

```ts
remove(item: T): Promise<void>
```

Removes a saved document. It throws when `_id` or `_rev` is absent.

#### `removeById(id)`

```ts
removeById(id: IDType): Promise<boolean>
```

Looks up and removes a document. Returns `false` when it is missing.

#### `bulkRemove(items)`

```ts
bulkRemove(items: T[]): Promise<PouchBulkResult[]>
```

Copies the documents, marks the copies as deleted, and passes them to PouchDB. The supplied objects are not changed.

### Change hooks

```ts
onChangeUpserted(item: T): Promise<void>
onChangeDeleted(item: T): Promise<void>
onChangeError(error: Error): Promise<void>
```

Override these methods to receive changes for this collection. If an upsert or delete hook rejects, PouchORM calls `onChangeError`. If `onChangeError` itself rejects, PouchORM suppresses that rejection to avoid an unhandled promise rejection.

## `PouchORM`

### Configuration

#### `PouchORM.LOGGING`

Enables diagnostic output. Defaults to `false`.

#### `PouchORM.VALIDATE`

Sets the validation mode inherited by collections using `ClassValidate.INHERIT`. Defaults to `OFF`.

#### `PouchORM.adapter`

Sets the default adapter for local databases. Configure it before opening a database.

#### `PouchORM.PouchDB`

The PouchDB peer-dependency constructor used internally. The find plugin is installed on it.

#### `useClassValidator(validator)`

Registers the validator used by collection validation. Install `class-validator`, import its module, and register it before saving validated models:

```ts
import * as classValidator from "class-validator";
import { PouchORM } from "pouchorm";

PouchORM.useClassValidator(classValidator);
```

PouchORM throws a clear configuration error if validation is enabled before this call.

#### `usePouchDB(constructor)`

Installs the find plugin on a custom PouchDB constructor and makes PouchORM use it. Call this before any database is opened; otherwise the method throws.

### Opening databases

#### `openDatabase(databaseName, options?)`

```ts
openDatabase(
  databaseName: string,
  options?: PouchDatabaseConfiguration
): PouchDatabase<IModel>
```

Opens or returns a database and starts its change listener. Collections call this automatically. It is also useful when synchronization should begin before a collection is created.

### Recording who saved a document

#### `setUser(userId?)`

Sets `$by` on later upserts. Calling it without an ID clears the setting. This is metadata, not authentication or an audit log.

### Change notifications

#### `beginChangeListener(databaseName)`

Starts notifications for an open database. Throws when the database has not been opened.

#### `stopChangeListener(databaseName)`

Stops notifications. Returns `true` when a listener was stopped and `false` when none was active.

### Synchronization

#### `startSync(fromDatabase, toDatabase, configuration?)`

```ts
interface ORMSyncOptions<T extends object> {
  options?: PouchSyncOptions;
  onChange?: (change: SyncResult<T>) => unknown;
  onPaused?: (info: unknown) => unknown;
  onActive?: () => unknown;
  onDenied?: (error: unknown) => unknown;
  onComplete?: (info: unknown) => unknown;
  onError?: (error: unknown) => unknown;
}

startSync<T extends IModel>(
  fromDatabase: string,
  toDatabase: string,
  configuration?: ORMSyncOptions<T>
): Sync<T>
```

Starts two-way synchronization and returns its handle. The default PouchDB options are `live: true` and `retry: true`; values in `configuration.options` may replace them.

If a callback rejects or throws, PouchORM sends that error to `onError`. Calling this method again for the same pair cancels and replaces the previous operation.

A local destination name is opened or reused with `PouchORM.adapter`. An HTTP or HTTPS destination is passed to PouchDB as a remote address.

#### `getActiveSync(fromDatabase, toDatabase)`

Returns the registered synchronization handle, or `undefined`.

#### `stopSync(fromDatabase, toDatabase?)`

Stops one operation, or every operation starting from `fromDatabase` when the destination is omitted. Returns the number stopped and removes them from the registry.

### Deleting data

#### `clearDatabase(databaseName)`

Deletes application documents while preserving PouchDB design documents and indexes. Existing collections remain usable. Returns one PouchDB result per deleted document.

#### `deleteDatabase(databaseName)`

Stops the change listener and every synchronization where the database is either source or destination. It then destroys and unregisters the database. Existing collection instances must not be reused.

## Validation modes

| Mode            | Behavior                                                                              |
| --------------- | ------------------------------------------------------------------------------------- |
| `INHERIT`       | Use `PouchORM.VALIDATE`. This is the collection default.                              |
| `OFF`           | Do not validate, even when global validation is enabled.                              |
| `ON`            | Check the document and save it. Print errors only when `PouchORM.LOGGING` is enabled. |
| `ON_AND_LOG`    | Check the document, print validation errors, and save it.                             |
| `ON_AND_REJECT` | Reject an invalid document without saving it.                                         |

Validation applies to `upsert` and `bulkUpsert`. Install and register `class-validator` before enabling it.

## Fields maintained by PouchORM

| Field             | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `_id`             | PouchDB document ID. Generated when absent.               |
| `_rev`            | Current PouchDB revision.                                 |
| `_deleted`        | PouchDB deletion marker.                                  |
| `$timestamp`      | Millisecond Unix timestamp assigned by an upsert.         |
| `$collectionType` | Stable collection name supplied to the constructor.       |
| `$by`             | Last value supplied through `PouchORM.setUser`, or `...`. |

When writing through `collection.db`, set `$collectionType` to `collection.collectionName` if the document should appear in that collection's queries.

## `UpsertHelper`

```ts
const helper = UpsertHelper(item);
helper.merge(existing);
helper.replace(existing);
```

`merge` retains stored fields that are absent from `item`. `replace` keeps only `item`'s fields. Both retain the current revision.

## PouchDB-facing types

PouchORM exports `PouchDatabase`, `PouchDBConstructor`, `PouchDatabaseConfiguration`, `PouchFindRequest`, `PouchFindResponse`, `PouchSyncOptions`, `Sync`, `SyncResult`, `ClassValidator`, and the associated result types. These declarations are self-contained and do not require the outdated global `@types/pouchdb` declarations in an application.
