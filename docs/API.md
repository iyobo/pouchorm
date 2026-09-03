# PouchORM API reference

This reference describes the public PouchORM 4 exports. Examples import from `pouchorm`.

## Models

### `IModel<IDType>`

Base interface for collection documents. `IDType` defaults to `string` and must extend `string`.

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

Application model interfaces should extend `IModel`.

### `PouchModel<T, IDType>`

Base class that assigns the supplied object's enumerable properties to the new instance.

```ts
class Person extends PouchModel<Person> {
  name: string;
}

const person = new Person({ name: "Ada" });
```

Use class instances when relying on decorator metadata from `class-validator`.

## `PouchCollection<T, IDType>`

Abstract base class for a typed collection. `T` must extend `IModel<IDType>` and `IDType` defaults to `string`.

### Constructor

```ts
new Collection(
  dbName: string,
  options?: PouchDB.Configuration.DatabaseConfiguration,
  validate?: ClassValidate
)
```

- `dbName` identifies the PouchDB database.
- `options` are passed to PouchDB only when that database name is first registered.
- `validate` defaults to `ClassValidate.OFF`. If it is `OFF`, an enabled global `PouchORM.VALIDATE` setting still applies.

The collection is registered immediately and initialized lazily on its first query or write.

### Properties

#### `db`

The underlying `PouchDB.Database` instance.

#### `collectionTypeName`

The discriminator stored in `$collectionType`. It defaults to the collection class's runtime name.

#### `validate`

The collection-level `ClassValidate` mode.

#### `idGenerator`

```ts
(item?: T) => IDType | Promise<IDType>
```

Optional custom generator for documents without `_id`. The default is a UUID string.

### Initialization hooks

#### `beforeInit()`

```ts
beforeInit(): Promise<void>
```

Override to create collection-specific indexes or perform other work before built-in indexes are ready.

#### `afterInit()`

```ts
afterInit(): Promise<void>
```

Override for work that must run after all built-in indexes are ready.

#### `checkInit()`

```ts
checkInit(): Promise<void>
```

Ensures initialization is complete. Normal collection operations call this automatically. Concurrent callers wait on the same initialization attempt; a failed attempt can be retried by the next operation.

### Indexes

#### `addIndex(fields, name?)`

```ts
addIndex(fields: (keyof T)[], name?: string): Promise<CreateIndexResponse>
```

Creates a Mango index. PouchORM prefixes `$collectionType` to the index without changing the supplied `fields` array. Use a stable name if you may remove the index later.

#### `removeIndex(name)`

```ts
removeIndex(name: string): Promise<void>
```

Removes a named index that was added through the current collection instance. If that instance has not recorded the name, the method is a no-op.

### Queries

Selectors use PouchDB Mango syntax. PouchORM adds the collection discriminator without changing the supplied selector object.

#### `find(selector?, options?)`

```ts
find(
  selector?: Partial<T> | Record<string, any>,
  options?: { sort?: string[]; limit?: number }
): Promise<T[]>
```

Returns all matching documents, optionally sorted or limited.

#### `findOne(selector)`

Returns the first matching document, or `null` at runtime when there is no match.

#### `findOrFail(selector?, options?)`

Returns matching documents. Throws when the result is empty.

#### `findOneOrFail(selector)`

Returns the first match. Throws when there is no match.

#### `findById(id)`

Returns the matching document, or `null` at runtime when the ID is empty or missing.

#### `findByIdOrFail(id)`

Returns the matching document. Throws when there is no match.

### Writes

#### `upsert(item, deltaFunc?)`

```ts
upsert(item: T, deltaFunc?: (existing: T) => T): Promise<T>
```

Creates a document or updates the document with the same `_id`.

For an update, the default delta function replaces application fields while preserving the current `_rev`. Pass a custom function—or `UpsertHelper(item).merge`—to merge with the stored document.

When configured, class validation runs before metadata is assigned and before the document is written.

#### `remove(item)`

```ts
remove(item: T): Promise<void>
```

Removes a document using its `_id` and `_rev`.

#### `removeById(id)`

```ts
removeById(id: IDType): Promise<void>
```

Looks up and removes a document. Missing documents are ignored.

#### `bulkUpsert(items)`

```ts
bulkUpsert(
  items: T[]
): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>>
```

Assigns PouchORM metadata and passes the documents to `bulkDocs`. It does not run validation, load existing revisions, or invoke a delta function. Existing documents need a current `_rev`.

#### `bulkRemove(items)`

```ts
bulkRemove(
  items: T[]
): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>>
```

Marks the supplied objects as `_deleted` and passes them to `bulkDocs`.

### Change hooks

The database's live changes feed dispatches documents to every registered collection whose discriminator matches.

```ts
onChangeUpserted(item: T): Promise<void>
onChangeDeleted(item: T): Promise<void>
onChangeError(error: Error): Promise<void>
```

Override these methods to receive notifications. Hook completion is not awaited by the write that caused the change.

## `PouchORM`

Static coordinator for database instances, changes feeds, validation defaults, and replication.

### Configuration

#### `PouchORM.LOGGING`

Boolean diagnostic logging flag. Defaults to `false`.

#### `PouchORM.VALIDATE`

Global `ClassValidate` mode. Defaults to `OFF`.

#### `PouchORM.adapter`

Optional PouchDB adapter name. Set it before constructing the first collection for a database.

#### `PouchORM.PouchDB`

The PouchDB constructor used internally. `pouchdb-find` is installed by default; use `.plugin(...)` to add other plugins.

### User metadata

#### `setUser(userId)`

```ts
PouchORM.setUser(userId: string): void
```

Sets the value assigned to `$by` on later writes. If no user is set, `$by` is `...`. This is a last-writer label, not an audit log or authentication mechanism.

### Changes feed control

#### `beginChangeListener(dbName)`

Starts a stopped changes feed for a registered database. Collection construction starts it automatically.

#### `stopChangeListener(dbName)`

Stops the changes feed for a registered database. Calling it for an unknown database is a no-op. Call `beginChangeListener` to resume notifications.

### Synchronization

#### `startSync(fromDB, toDB, options?)`

```ts
type ORMSyncOptions = {
  opts?: PouchDB.Replication.SyncOptions;
  onChange?: (change: PouchDB.Replication.SyncResult<IModel>) => unknown;
  onPaused?: (info: unknown) => unknown;
  onError?: (error: unknown) => unknown;
};
```

Starts live, retrying, bidirectional synchronization. `fromDB` must already be registered. `toDB` may be a local name or remote database URL. Starting the same pair again cancels and replaces its previous sync operation.

#### `stopSync(fromDB, toDB?)`

Stops one destination sync, or every sync whose source is `fromDB` when `toDB` is omitted.

### Destructive operations

#### `clearDatabase(dbName)`

Marks every current document as deleted and returns the `bulkDocs` results. The database remains registered and its collection instances remain usable.

#### `deleteDatabase(dbName)`

Stops the database's changes feed and outgoing sync operations, destroys the PouchDB database, and unregisters it. Existing collection instances should not be reused.

## Validation modes

`ClassValidate` has four values:

| Mode            | Behavior during `upsert`                                                               |
| --------------- | -------------------------------------------------------------------------------------- |
| `OFF`           | Do not validate.                                                                       |
| `ON`            | Run validation and discard the result; log it only when `PouchORM.LOGGING` is enabled. |
| `ON_AND_LOG`    | Run validation and log the result.                                                     |
| `ON_AND_REJECT` | Call `validateOrReject` and reject invalid documents.                                  |

Validation is not applied to `bulkUpsert`.

## Metadata fields

PouchORM maintains these fields:

| Field             | Purpose                                                   |
| ----------------- | --------------------------------------------------------- |
| `_id`             | PouchDB document ID; generated when absent.               |
| `_rev`            | Current PouchDB revision.                                 |
| `_deleted`        | PouchDB deletion marker.                                  |
| `$timestamp`      | Millisecond Unix timestamp assigned by each upsert.       |
| `$collectionType` | Collection discriminator used in every collection query.  |
| `$by`             | Value last supplied through `PouchORM.setUser`, or `...`. |

Direct PouchDB document writes need a valid `$collectionType` to appear in collection queries.

## `UpsertHelper`

```ts
const helper = UpsertHelper(item);
helper.merge(existing); // existing fields plus item fields, current _rev retained
helper.replace(existing); // item fields only, current _rev retained
```

Both helpers are suitable as the second argument to `upsert`.

## Sync type aliases

```ts
type SyncResult<T> = PouchDB.Replication.SyncResult<T>;
type Sync<T> = PouchDB.Replication.Sync<T>;
```

These aliases are re-exported for consumers that need to type sync callbacks or handles.
