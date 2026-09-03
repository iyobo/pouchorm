# PouchORM

[![CI](https://github.com/iyobo/pouchorm/actions/workflows/main.yml/badge.svg)](https://github.com/iyobo/pouchorm/actions/workflows/main.yml)
[![npm](https://img.shields.io/npm/v/pouchorm.svg)](https://www.npmjs.com/package/pouchorm)
[![license](https://img.shields.io/npm/l/pouchorm.svg)](LICENSE)

A clearer way to work with PouchDB documents in TypeScript. PouchORM provides typed models, collection-style queries, optional validation, change notifications, and database syncing.

PouchDB stores documents in databases rather than tables. PouchORM stores the collection name with each document, so different types of model can share one database.

## Features

- Typed models and custom string ID types
- Multiple collections in one PouchDB database
- Indexes created when a collection is first used
- Methods to create, query, update, and delete documents
- Optional validation through [`class-validator`](https://github.com/typestack/class-validator)
- Run your own code when documents change
- Local and remote database syncing
- Direct PouchDB access when you need it

## Installation

```sh
npm install pouchorm
```

With Yarn:

```sh
yarn add pouchorm
```

Install `class-validator` when you enable class validation:

```sh
npm install class-validator
```

PouchORM 4 uses PouchDB 9 and is published as a CommonJS package with TypeScript declarations.

## Quick start

Define a model and a collection. Index every field you plan to sort by or query frequently.

```ts
import { IModel, PouchCollection } from "pouchorm";

interface Person extends IModel {
  name: string;
  age: number;
}

class People extends PouchCollection<Person> {
  async beforeInit(): Promise<void> {
    await this.addIndex(["age"], "people-by-age");
  }
}

export const people = new People("app-data");
```

PouchORM creates a collection's indexes the first time you use it. There is no separate setup step.

```ts
const ada = await people.upsert({
  name: "Ada Lovelace",
  age: 36,
});

const adults = await people.find({ age: { $gte: 18 } }, { sort: ["age"] });

ada.age = 37;
const updatedAda = await people.upsert(ada);

await people.remove(updatedAda);
```

`upsert` returns the saved document. The result includes its ID (`_id`), current revision (`_rev`), and the fields PouchORM uses to track its collection and last update.

## Collections and databases

Pass the same database name to collections that should share one PouchDB database:

```ts
const people = new People("app-data");
const projects = new Projects("app-data");
const archivedPeople = new People("archive-data");
```

PouchORM opens each database once. If several collections use the same database name, only the PouchDB options passed to the first collection are used.

PouchORM uses the collection's class name to decide which documents belong to it. If you rename a collection class, previously saved documents keep the old name and no longer appear in that collection. Plan a data migration before renaming one.

## Updating documents

The default update behavior replaces the stored document with the object you pass while preserving the current `_rev`. Use `UpsertHelper(...).merge` when you want to merge fields instead:

```ts
import { UpsertHelper } from "pouchorm";

const patch: Person = {
  _id: ada._id,
  name: "Ada Byron",
  age: 37,
};

const merged = await people.upsert(patch, UpsertHelper(patch).merge);
```

## Class models and validation

Extend `PouchModel` when you want class instances, decorator-based validation, or both:

```ts
import { IsInt, IsString, Min } from "class-validator";
import { ClassValidate, PouchCollection, PouchModel } from "pouchorm";

class Person extends PouchModel<Person> {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  age: number;
}

class People extends PouchCollection<Person> {}

const people = new People("app-data", undefined, ClassValidate.ON_AND_REJECT);

await people.upsert(new Person({ name: "Ada", age: 36 }));
```

Validation runs on `upsert`, not `bulkUpsert`. Pass a class instance such as `new Person(...)` when using decorators; a plain object does not include the information those decorators need.

## Responding to changes

Override these methods to run code when a document in the collection is saved or deleted:

```ts
class People extends PouchCollection<Person> {
  async onChangeUpserted(person: Person): Promise<void> {
    console.log("Changed:", person._id);
  }

  async onChangeDeleted(person: Person): Promise<void> {
    console.log("Deleted:", person._id);
  }

  async onChangeError(error: Error): Promise<void> {
    console.error("Changes feed failed:", error);
  }
}
```

Saving or deleting a document can finish before its hook finishes. Catch and handle errors inside each hook.

## Syncing databases

Create at least one collection for the first database before calling `startSync`. The second database can be another local database or a remote CouchDB-compatible URL.

```ts
import { PouchORM } from "pouchorm";

const people = new People("local-data");

PouchORM.startSync("local-data", "https://example.com/app-data", {
  onChange(change) {
    console.log("Sync direction:", change.direction);
  },
  onPaused(info) {
    console.log("Sync paused:", info);
  },
  onError(error) {
    console.error("Sync failed:", error);
  },
});

PouchORM.stopSync("local-data", "https://example.com/app-data");
```

PouchORM keeps the two databases in sync. Changes move in both directions, and PouchDB retries after a connection problem. Put any additional PouchDB sync settings in `options.opts`. See the [PouchDB replication guide](https://pouchdb.com/guides/replication.html) for authentication, filtering, and other options.

## Custom IDs

Set `idGenerator` on a collection instance or define it as a property on the collection class. It can return an ID immediately or return a promise.

```ts
import { IModel, PouchCollection } from "pouchorm";

type PersonId = `person:${string}`;

interface PersonWithCustomId extends IModel<PersonId> {
  name: string;
  age: number;
}

class PeopleWithCustomIds extends PouchCollection<
  PersonWithCustomId,
  PersonId
> {
  idGenerator = (): PersonId => `person:${crypto.randomUUID()}`;
}
```

The default is a UUID string.

## Raw PouchDB access

Every collection exposes its PouchDB database as `collection.db`:

```ts
await people.db.putAttachment(
  ada._id,
  "avatar.png",
  ada._rev,
  avatarBlob,
  "image/png"
);
```

You can install additional plugins on the PouchDB constructor used by PouchORM:

```ts
PouchORM.PouchDB.plugin(myPlugin);
```

When saving a document through the raw PouchDB API, set `$collectionType` to the collection's class name. Otherwise, PouchORM queries will not find that document.

## Clearing or deleting a database

```ts
await PouchORM.clearDatabase("app-data"); // delete every document
await PouchORM.deleteDatabase("app-data"); // destroy and unregister the database
```

Both operations are irreversible. Existing collection instances should not be reused after `deleteDatabase`.

## Bulk writes

`bulkUpsert` and `bulkRemove` send an array of documents to PouchDB's `bulkDocs` method after adding the fields PouchORM needs:

- they return one PouchDB response or error per item, not the saved documents;
- `bulkUpsert` does not run class validation or merge existing fields;
- updates must include the current `_rev`, just as they do with `bulkDocs`;
- `bulkRemove` marks each supplied object as `_deleted`.

Use individual `upsert` calls when you need validation or merge behavior.

## Documentation

- [Complete API reference](docs/API.md)
- [Contributing guide](CONTRIBUTING.md)
- [PouchDB documentation](https://pouchdb.com/)

## License

[MIT](LICENSE)
