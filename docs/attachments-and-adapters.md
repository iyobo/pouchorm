---
title: Attachments and adapters
hide_title: true
description: Access PouchDB attachments, plugins, custom constructors, and platform adapters.
---

# Attachments and adapters

PouchORM exposes the underlying PouchDB database and constructor for features that do not need collection-level handling.

## Work with attachments

Every collection has a `db` property:

```ts
await people.db.putAttachment(
  person._id!,
  "avatar.png",
  person._rev!,
  avatarBlob,
  "image/png",
);

const avatar = await people.db.getAttachment(person._id!, "avatar.png");
```

Use the current `_rev` when adding, replacing, or removing an attachment. Read the updated document before another write when the attachment operation changes its revision.

## Add a PouchDB plugin

PouchDB is a peer dependency, so the application and PouchORM use the same constructor. Add plugins before opening a database:

```ts
import myPlugin from "pouchdb-example-plugin";
import { PouchORM } from "pouchorm";

PouchORM.PouchDB.plugin(myPlugin);
```

PouchORM installs `pouchdb-find` itself.

## Use a custom PouchDB build

Some platforms use a custom PouchDB constructor or a selected set of adapters:

```ts
import CustomPouchDB from "pouchdb-core";
import { PouchORM } from "pouchorm";

PouchORM.usePouchDB(CustomPouchDB);
```

Call `usePouchDB` before any collection or database is opened. PouchORM rejects later changes so existing databases cannot silently use a different constructor.

## Configure a local adapter

Set the default adapter before opening a database:

```ts
PouchORM.PouchDB.plugin(memoryAdapter);
PouchORM.adapter = "memory";
```

Or pass PouchDB options from a collection:

```ts
super({
  database: "app-data",
  collection: "people",
  pouch: { adapter: "idb" },
});
```

The first call that opens a named database determines its constructor options.

## Write raw documents carefully

Raw writes bypass collection metadata and validation. If a document must appear in collection queries, set `$collectionType` to the exact `collection.collectionName` value. Prefer `upsert` for application documents unless the raw operation is intentional.
