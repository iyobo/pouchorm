---
title: Querying
hide_title: true
description: Find collection documents with Mango selectors, sorting, limits, and fail variants.
---

# Querying

PouchORM uses the PouchDB Find plugin and Mango selectors. Every collection query includes the collection's `$collectionType`, so documents stored for another collection are excluded.

## Find documents

Call `find()` to return every document in the collection:

```ts
const allPeople = await people.find();
```

Pass a Mango selector to filter the result:

```ts
const adults = await people.find({ age: { $gte: 18 } });
```

PouchORM does not change the selector object supplied by the caller.

## Sort and limit results

Create an index for fields used in sorted queries:

```ts
async beforeInit(): Promise<void> {
  await this.addIndex(["age"], "people-by-age");
}
```

Then specify a direction:

```ts
const oldestFirst = await people.find(
  // Select every non-negative age.
  { age: { $gte: 0 } },
  // Return at most 20 matches, ordered from oldest to youngest.
  { sort: [{ age: "desc" }], limit: 20 },
);
```

String entries such as `"age"` mean ascending order. PouchDB requires all fields in a multi-field sort to use the same direction; PouchORM rejects mixed directions before sending the query.

## Find one document

```ts
// findOne returns null rather than throwing when there is no match.
const ada = await people.findOne({ name: "Ada Lovelace" });
```

`findOne` returns the first match or `null`. It does not imply a unique constraint.

Use `findById` for a document ID:

```ts
const person = await people.findById(personId);
```

`findById` reads the document directly and returns `null` if it is missing or belongs to another collection.

## Throw when nothing matches

Use the fail variants when absence should stop the current operation:

```ts
// These variants make a missing result an error.
const person = await people.findByIdOrFail(personId);
const matches = await people.findOrFail({ age: { $gte: 18 } });
```

`findOneOrFail`, `findByIdOrFail`, and `findOrFail` throw an `Error` with the collection name and lookup information.

## Use native PouchDB queries

`collection.db` exposes the underlying database. Raw queries do not automatically add `$collectionType`; add it explicitly when the result must stay within one collection.
