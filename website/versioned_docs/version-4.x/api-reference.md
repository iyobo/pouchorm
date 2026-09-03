---
id: api-reference
title: 4.x API reference
hide_title: true
description: Public collection and database methods in PouchORM 4.1.4.
---

# 4.x API reference

:::warning Archived release

This reference describes PouchORM 4.1.4. Select 5.x for the current API.

:::

## `PouchCollection<T, IDType>`

### Constructor

```ts
new Collection(
  databaseName: string,
  options?: PouchDB.Configuration.DatabaseConfiguration,
  validate: ClassValidate = ClassValidate.OFF,
)
```

PouchORM 4 uses the JavaScript subclass name as `$collectionType`.

### Queries

```ts
find(selector?, options?: { sort?: string[]; limit?: number }): Promise<T[]>
findOrFail(selector?, options?): Promise<T[]>
findOne(selector): Promise<T>
findOneOrFail(selector): Promise<T>
findById(id): Promise<T>
findByIdOrFail(id): Promise<T>
```

`findOne` and `findById` return `null` at runtime when no document matches, despite the non-null 4.x declarations.

### Writes

```ts
upsert(item, delta?): Promise<T>
bulkUpsert(items): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>>
remove(item): Promise<void>
removeById(id): Promise<void>
bulkRemove(items): Promise<Array<PouchDB.Core.Response | PouchDB.Core.Error>>
```

`upsert` and the bulk methods change supplied objects when adding metadata or deletion markers. `bulkUpsert` does not share the validation and update behavior of `upsert`.

### Indexes and initialization

```ts
beforeInit(): Promise<void>
afterInit(): Promise<void>
checkInit(): Promise<void>
addIndex(fields, name?): Promise<CreateIndexResponse>
removeIndex(name): Promise<void>
```

### Change hooks

```ts
onChangeUpserted(item): Promise<void>
onChangeDeleted(item): Promise<void>
onChangeError(error): Promise<void>
```

PouchORM 4 does not await hook completion and does not forward a rejected hook promise to `onChangeError`.

## `PouchORM`

```ts
PouchORM.LOGGING;
PouchORM.VALIDATE;
PouchORM.ClassValidator;
PouchORM.PouchDB;
PouchORM.adapter;
PouchORM.userId;
```

### Database methods

```ts
PouchORM.ensureDatabase(databaseName, collection, options?)
PouchORM.stopChangeListener(databaseName)
PouchORM.setUser(userId)
PouchORM.clearDatabase(databaseName)
PouchORM.deleteDatabase(databaseName)
```

`clearDatabase` removes design documents in 4.x, including indexes. `deleteDatabase` stops outgoing synchronization but may leave incoming operations registered elsewhere.

### Synchronization methods

```ts
PouchORM.startSync(fromDatabase, toDatabase, configuration?)
PouchORM.stopSync(fromDatabase, toDatabase?)
PouchORM.activeSyncOperations
```

The configuration property for PouchDB options is named `opts` in 4.x. `startSync` does not return the handle.

## Upgrade

The [PouchORM 5 migration guide](https://iyobo.github.io/pouchorm/docs/migrating-to-v5) maps these APIs to their current equivalents.
