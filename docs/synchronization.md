---
title: Synchronization
hide_title: true
description: Start, inspect, stop, and handle errors from PouchDB database synchronization.
---

# Synchronization

PouchORM keeps track of PouchDB synchronization handles so an application can replace or stop them by database name.

## Start synchronization

The source database is opened automatically. An HTTP or HTTPS destination is passed to PouchDB as a remote address:

```ts
import { PouchORM } from "pouchorm";

const remote = "https://example.com/app-data";

const operation = PouchORM.startSync("local-data", remote, {
  // These options are passed through to PouchDB synchronization.
  options: { batch_size: 100 },
  onChange(change) {
    // "push" means local to remote; "pull" means remote to local.
    console.log("Sync direction:", change.direction);
  },
  onPaused(info) {
    console.log("Sync paused:", info);
  },
  onError(error) {
    console.error("Sync failed:", error);
  },
});
```

PouchORM passes `{ live: true, retry: true }` to PouchDB unless values in `options` replace those defaults. Consult the [PouchDB replication guide](https://pouchdb.com/guides/replication.html) for remote authentication, filters, checkpoints, and replication behavior.

If the destination is another local database name, PouchORM opens or reuses that database with the configured adapter.

## Handle lifecycle events

The configuration accepts `onChange`, `onPaused`, `onActive`, `onDenied`, `onComplete`, and `onError`. If another callback throws or returns a rejected promise, PouchORM sends that error to `onError`.

Completion and terminal errors remove the operation from PouchORM's registry.

## Inspect or stop an operation

```ts
// Inspect the existing handle without starting another operation.
const active = PouchORM.getActiveSync("local-data", remote);

PouchORM.stopSync("local-data", remote); // stop this pair
PouchORM.stopSync("local-data"); // stop every destination from local-data
```

`stopSync` returns the number of operations it stopped. Calling `startSync` again for the same source and destination cancels and replaces the earlier operation.

The returned handle also exposes PouchDB's `cancel()` method. Prefer `stopSync` when the registry should be updated immediately.

## Deleting synchronized databases

`deleteDatabase` stops synchronization where the database is either the source or destination before destroying it. Do not reuse a collection instance after deleting its database.

## Security responsibilities

Do not put credentials into URLs that may be logged. Configure remote authentication using the mechanism appropriate to the selected PouchDB build and runtime. The server remains responsible for authenticating requests and authorizing access to the remote database.
