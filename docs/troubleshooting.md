---
title: Troubleshooting
hide_title: true
description: Resolve common setup, query, validation, synchronization, and migration problems.
---

# Troubleshooting

## A collection returns no documents after a production build

Confirm that the collection constructor supplies the same explicit `collection` string in every build:

```ts
super({ database: "app-data", collection: "people" });
```

PouchORM 4 derived `$collectionType` from the JavaScript class name. If older production builds wrote minified names, inspect those stored values and migrate them to the chosen stable name. See [Migrating to PouchORM 5](migrating-to-v5.md).

## A sorted query reports that no matching index exists

Create an index containing the fields used by the selector and sort:

```ts
async beforeInit(): Promise<void> {
  await this.addIndex(["age"], "people-by-age");
}
```

PouchORM adds `$collectionType` to the beginning of that index. Ensure every field in a multi-field sort uses the same direction.

## Validation is enabled but no validator is configured

Install `class-validator`, then register its module before the first validated write:

```ts
import * as classValidator from "class-validator";

PouchORM.useClassValidator(classValidator);
```

Alternatively set the collection or global validation mode to `ClassValidate.OFF`.

## TypeScript reports that a query result may be null

`findOne` and `findById` return `null` when no document matches. Check the result or use an `OrFail` method:

```ts
const person = await people.findByIdOrFail(personId);
```

## A custom PouchDB constructor cannot be configured

Call `PouchORM.usePouchDB` before creating any collection or calling `openDatabase`. Once a database is open, changing the constructor would leave different databases using different plugin registries, so PouchORM rejects it.

## A collection fails after its database is deleted

Collection instances retain a reference to the destroyed database. Create new collection instances if the application intentionally recreates that database.

## A deletion hook does not run

Use `remove`, `removeById`, or `bulkRemove` when the deletion should reach
`onChangeDeleted`. A raw PouchDB deletion or a deletion replicated from an
older client may not contain `$collectionType`, so PouchORM cannot determine
which collection should receive it.

## Synchronization stops with an authentication error

PouchORM forwards PouchDB synchronization errors; it does not authenticate the remote database. Check the remote database policy and the authentication mechanism supported by the selected PouchDB runtime. Avoid credentials in URLs that may be logged.

## More help

Search the [issue tracker](https://github.com/iyobo/pouchorm/issues), then open an issue with the PouchORM version, PouchDB version, runtime, adapter, and a small reproduction if the problem remains.
