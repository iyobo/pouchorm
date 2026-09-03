---
title: Getting started
hide_title: true
description: Install PouchORM, define a collection, and save and query documents.
---

# Getting started

## Install the packages

Install PouchORM and its PouchDB peer dependency:

```sh
npm install pouchorm pouchdb
```

Install `class-validator` only if the application will validate class models:

```sh
npm install class-validator
```

## Define a model and collection

Every model extends `IModel`. Every collection receives a database name and a stable collection name.

```ts
import { IModel, PouchCollection } from "pouchorm";

interface Person extends IModel {
  name: string;
  age: number;
}

class People extends PouchCollection<Person> {
  constructor(database = "app-data") {
    super({ database, collection: "people" });
  }

  async beforeInit(): Promise<void> {
    await this.addIndex(["age"], "people-by-age");
  }
}

const people = new People();
```

The `collection` value is stored in `$collectionType` on every document. Keep it stable across builds and releases. Do not derive it from a JavaScript class name, because minification can change class names.

## Save a document

`upsert` creates a document without an `_id` and updates a document that already has one:

```ts
const ada = await people.upsert({
  name: "Ada Lovelace",
  age: 36,
});
```

The returned document includes its PouchDB `_id` and `_rev` values along with PouchORM metadata.

## Query the collection

Use a Mango selector. PouchORM adds the collection name to the selector:

```ts
const adults = await people.find(
  { age: { $gte: 18 } },
  { sort: [{ age: "desc" }] },
);
```

Call `find()` without a selector to return every document in the collection.

## Update and remove the document

Pass a saved `_id` to update that document. The default update replaces stored application fields:

```ts
const updatedAda = await people.upsert({ ...ada, age: 37 });
await people.remove(updatedAda);
```

Read [Creating and updating documents](writes.md) before implementing partial updates or bulk operations.

## Next steps

- [Models and collections](models-and-collections.md)
- [Querying](querying.md)
- [Creating and updating documents](writes.md)
- [Synchronization](synchronization.md)
