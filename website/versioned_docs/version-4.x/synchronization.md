---
id: synchronization
title: Synchronization in 4.x
hide_title: true
description: Archived synchronization configuration for PouchORM 4.1.4.
---

# Synchronization in 4.x

Open the source database by constructing a collection, then start synchronization:

```ts
const people = new PersonCollection("local-data");

PouchORM.startSync("local-data", "https://example.com/app-data", {
  opts: { batch_size: 100 },
  onChange(change) {
    console.log(change.direction);
  },
  onError(error) {
    console.error(error);
  },
});
```

PouchORM 4 creates a PouchDB instance for the destination and passes `{ live: true, retry: true }` unless `opts` replaces those values.

Stop one destination or every operation from a source:

```ts
PouchORM.stopSync("local-data", "https://example.com/app-data");
PouchORM.stopSync("local-data");
```

`startSync` does not return its handle. The mutable handles are available through `PouchORM.activeSyncOperations`.

PouchORM 5 changes `opts` to `options`, returns the handle, provides `getActiveSync`, and improves operation cleanup. See the [migration guide](https://iyobo.github.io/pouchorm/docs/migrating-to-v5).
