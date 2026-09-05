---
title: Creating and updating documents
hide_title: true
description: Use upsert, merge partial updates, handle conflicts, and remove documents.
---

# Creating and updating documents

## Create a document

`upsert` generates an ID when the input has none, adds metadata, writes through PouchDB, and returns the saved document:

```ts
// Omitting _id creates a document with a generated UUIDv7.
const created = await people.upsert({
  name: "Grace Hopper",
  age: 85,
});
```

PouchORM does not add `_id`, `_rev`, or metadata to the object passed by the caller.

## Replace an existing document

Pass an existing `_id` to update that document:

```ts
// Supplying the saved _id updates that document rather than creating one.
const updated = await people.upsert({
  _id: created._id,
  name: "Grace Hopper",
  age: 86,
});
```

The default update replaces stored application fields with the supplied fields. PouchORM retains the latest revision internally.

## Merge a partial update

Use `UpsertHelper` when fields missing from the new object should remain stored:

```ts
import { UpsertHelper } from "pouchorm";

const patch: Person = {
  _id: created._id,
  name: "Rear Admiral Grace Hopper",
  age: 86,
};

// merge keeps stored fields that are absent from patch.
const merged = await people.upsert(patch, UpsertHelper(patch).merge);
```

The second argument may be any function that receives the latest stored document and returns the candidate update.

If another writer creates a revision between the read and write, PouchORM reads the latest revision and tries again. It makes at most five attempts, then returns the PouchDB conflict error.

## Write several documents

```ts
const saved = await people.bulkUpsert([
  { name: "Evelyn Boyd Granville", age: 99 },
  { name: "Katherine Johnson", age: 101 },
]);
```

`bulkUpsert` uses the same ID generation, validation, update, and conflict path as `upsert`. Items are processed in order and the operation is not transactional. If a later item fails, earlier items remain saved.

## Remove documents

Remove a saved document with its `_id` and `_rev`:

```ts
// Use the saved object so remove receives both _id and the current _rev.
await people.remove(saved[0]);
```

Remove by ID when the caller does not already have the current revision:

```ts
// removeById reads the current revision before deleting.
const removed = await people.removeById(personId);
```

`removeById` returns `false` when the document is missing.

PouchORM checks the stored collection name before deleting. Passing a document
from another collection rejects the operation and leaves that document stored.

Use `bulkRemove` for several saved documents. PouchORM checks that every
stored document belongs to the collection before submitting the batch. It
copies the documents before marking them as deleted, so the caller's objects
are unchanged. The PouchDB batch is not transactional; revision conflicts are
reported separately for each document.

Deletions made through these collection methods retain their collection name,
allowing `onChangeDeleted` to run for the owning collection. Direct
`collection.db` deletions bypass these checks and may not produce a
collection deletion hook.
