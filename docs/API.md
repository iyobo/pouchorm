# PouchORM API reference

This reference describes the public PouchORM 4 exports. Examples import from `pouchorm`.

## Models

### `IModel<IDType>`

Extend this interface when defining a model. `IDType` defaults to `string` and must be a type of string.

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

Extend this class to create models from class instances. Its constructor copies the values you pass onto the new model.

```ts
class Person extends PouchModel<Person> {
  name: string;
}

const person = new Person({ name: "Ada" });
```

Use class instances when validating with `class-validator` decorators.

## `PouchCollection<T, IDType>`

Extend this class to define a collection. `T` must extend `IModel<IDType>`, and `IDType` defaults to `string`.

### Constructor

```ts
new Collection(
  dbName: string,
  options?: PouchDB.Configuration.DatabaseConfiguration,
  validate?: ClassValidate
)
```

- `dbName` identifies the PouchDB database.
- `options` are passed to PouchDB the first time that database is opened.
- `validate` defaults to `ClassValidate.OFF`. If it is `OFF`, an enabled global `PouchORM.VALIDATE` setting still applies.

PouchORM creates the collection's indexes when you first query or write to it.

### Properties

#### `db`

The underlying `PouchDB.Database` instance.

#### `collectionTypeName`

The value saved in `$collectionType`. By default, it is the collection's class name.

#### `validate`

The collection-level `ClassValidate` mode.

#### `idGenerator`

```ts
(item?: T) => IDType | Promise<IDType>
```

Optional function for creating IDs. PouchORM uses a UUID string when you do not provide one.

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

Waits until the collection's indexes are ready. Collection operations call this automatically, so most applications never need to call it. When several operations start at once, they wait for the same setup work. If setup fails, the next operation tries again.

### Indexes

#### `addIndex(fields, name?)`

```ts
addIndex(fields: (keyof T)[], name?: string): Promise<CreateIndexResponse>
```

Creates a Mango index that begins with `$collectionType`. It does not change the `fields` array you pass in. Give the index a stable name if you may remove it later.

#### `removeIndex(name)`

```ts
removeIndex(name: string): Promise<void>
```

Removes a named index that was added through the current collection instance. If that instance has not recorded the name, the method is a no-op.

### Queries

Selectors use PouchDB's Mango query format. PouchORM adds `$collectionType` to the query without changing the selector object you pass in.

#### `find(selector?, options?)`

```ts
find(
  selector?: Partial<T> | Record<string, any>,
  options?: { sort?: string[]; limit?: number }
): Promise<T[]>
```

Returns all matching documents, optionally sorted or limited.

#### `findOne(selector)`

Returns the first matching document, or `null` when there is no match.

#### `findOrFail(selector?, options?)`

Returns matching documents. Throws when the result is empty.

#### `findOneOrFail(selector)`

Returns the first match. Throws when there is no match.

#### `findById(id)`

Returns the matching document, or `null` when the ID is empty or missing.

#### `findByIdOrFail(id)`

Returns the matching document. Throws when there is no match.

### Writes

#### `upsert(item, deltaFunc?)`

```ts
upsert(item: T, deltaFunc?: (existing: T) => T): Promise<T>
```

Creates a document or updates the document with the same `_id`.

When the ID already exists, `upsert` replaces the document's fields and keeps its current `_rev`. Pass `UpsertHelper(item).merge` when you want to keep fields that are already stored. You can also pass your own merge function.

When validation is enabled, PouchORM validates the document before adding its own fields and saving it.

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

Adds the fields PouchORM needs and passes the documents to `bulkDocs`. It does not validate documents, look up their latest revisions, or merge existing fields. Include the current `_rev` when updating an existing document.

#### `bulkRemove(items)`

```ts
bulkRemove(
  items: T[]
): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>>
```

Marks the supplied objects as `_deleted` and passes them to `bulkDocs`.

### Change hooks

PouchORM watches each open database for changes and sends each changed document to the hooks for its collection.

```ts
onChangeUpserted(item: T): Promise<void>
onChangeDeleted(item: T): Promise<void>
onChangeError(error: Error): Promise<void>
```

Override these methods to receive notifications. The save or delete operation can finish before its hook finishes.

## `PouchORM`

Use these static methods and properties to configure PouchORM, control change notifications, sync databases, and delete data.

### Configuration

#### `PouchORM.LOGGING`

Set to `true` to print diagnostic messages. Defaults to `false`.

#### `PouchORM.VALIDATE`

Default validation setting for all collections. Defaults to `OFF`.

#### `PouchORM.adapter`

Name of the PouchDB adapter to use. Set it before creating the first collection for a database.

#### `PouchORM.PouchDB`

The PouchDB constructor used by PouchORM. The `pouchdb-find` plugin is already installed. Use `.plugin(...)` to add another plugin.

### Recording who saved a document

#### `setUser(userId)`

```ts
PouchORM.setUser(userId: string): void
```

Sets `$by` on documents saved after the call. If no user is set, `$by` is `...`. This records only the last supplied user ID; it is not an audit log or a way to authenticate users.

### Change notifications

#### `beginChangeListener(dbName)`

Restarts change notifications for an open database. Creating a collection starts them automatically.

#### `stopChangeListener(dbName)`

Stops change notifications for an open database. It does nothing if the database is unknown. Call `beginChangeListener` to start notifications again.

### Syncing databases

#### `startSync(fromDB, toDB, options?)`

```ts
type ORMSyncOptions = {
  opts?: PouchDB.Replication.SyncOptions;
  onChange?: (change: PouchDB.Replication.SyncResult<IModel>) => unknown;
  onPaused?: (info: unknown) => unknown;
  onError?: (error: unknown) => unknown;
};
```

Keeps `fromDB` and `toDB` in sync. Changes move in both directions, and PouchDB retries after a connection problem. Create a collection that uses `fromDB` before calling this method. `toDB` can be a local database name or a remote URL. Calling `startSync` again for the same pair replaces the earlier sync.

#### `stopSync(fromDB, toDB?)`

Stops syncing one pair of databases. If you leave out `toDB`, it stops every sync that starts from `fromDB`.

### Deleting data

#### `clearDatabase(dbName)`

Deletes every document without removing the database itself. Existing collections remain usable. The method returns PouchDB's result for each deleted document.

#### `deleteDatabase(dbName)`

Stops change notifications and outgoing syncs, then permanently destroys the database and removes it from PouchORM. Do not reuse collections that pointed to the deleted database.

## Validation modes

`ClassValidate` has four values:

| Mode            | Behavior during `upsert`                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `OFF`           | Do not validate.                                                                                     |
| `ON`            | Check the document. Save it even when invalid. Print errors only when `PouchORM.LOGGING` is enabled. |
| `ON_AND_LOG`    | Check the document and print any errors. Save it even when invalid.                                  |
| `ON_AND_REJECT` | Reject an invalid document without saving it.                                                        |

Validation is not applied to `bulkUpsert`.

## Fields added by PouchORM

PouchORM maintains these fields:

| Field             | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `_id`             | PouchDB document ID; generated when absent.                  |
| `_rev`            | Current PouchDB revision.                                    |
| `_deleted`        | PouchDB deletion marker.                                     |
| `$timestamp`      | Millisecond Unix timestamp assigned by each upsert.          |
| `$collectionType` | Collection name used to keep different model types separate. |
| `$by`             | Value last supplied through `PouchORM.setUser`, or `...`.    |

When saving through the raw PouchDB API, set `$collectionType` to the collection's class name. Otherwise, PouchORM queries will not find the document.

## `UpsertHelper`

```ts
const helper = UpsertHelper(item);
helper.merge(existing); // existing fields plus item fields, current _rev retained
helper.replace(existing); // item fields only, current _rev retained
```

Both helpers are suitable as the second argument to `upsert`.

## Types for sync callbacks

```ts
type SyncResult<T> = PouchDB.Replication.SyncResult<T>;
type Sync<T> = PouchDB.Replication.Sync<T>;
```

These aliases are re-exported for consumers that need to type sync callbacks or handles.
