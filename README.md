# PouchORM

[![CI](https://github.com/iyobo/pouchorm/actions/workflows/main.yml/badge.svg)](https://github.com/iyobo/pouchorm/actions/workflows/main.yml)
[![npm](https://img.shields.io/npm/v/pouchorm.svg)](https://www.npmjs.com/package/pouchorm)
[![license](https://img.shields.io/npm/l/pouchorm.svg)](LICENSE)

A small, TypeScript-first object model for PouchDB. PouchORM adds typed models, collection-style queries, lifecycle hooks, optional class validation, and helpers for live PouchDB replication.

PouchDB stores documents in databases rather than tables. PouchORM lets several typed collections share one database by adding a collection discriminator to each document.

## Features

- Typed models and custom string ID types
- Multiple collections in one PouchDB database
- Lazy, concurrency-safe collection initialization and index creation
- CRUD and bulk operations backed by PouchDB
- Optional validation through [`class-validator`](https://github.com/typestack/class-validator)
- Per-collection change hooks
- Live synchronization between local or remote databases
- Access to the underlying PouchDB instance when you need the native API

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

Collections initialize on their first operation. You do not need a separate setup call.

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

`upsert` assigns `_id`, `$timestamp`, `$collectionType`, and `$by`. It returns the stored document, including its current PouchDB `_rev`.

## Collections and databases

Pass the same database name to collections that should share one PouchDB database:

```ts
const people = new People("app-data");
const projects = new Projects("app-data");
const archivedPeople = new People("archive-data");
```

The first collection created for a database name establishes that database's PouchDB options. PouchORM reuses the same instance for later collections with that name.

By default, a collection's discriminator is its JavaScript class name. Renaming a collection class therefore changes which existing documents it can see. Treat collection class names as persistent schema identifiers.

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

Validation runs on `upsert`, not `bulkUpsert`. Decorator validation requires class instances such as `new Person(...)`; plain objects do not carry the class metadata.

## Change hooks

Override collection hooks to react to changes observed by the live PouchDB changes feed:

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

Hooks are notifications: write methods do not wait for hook completion. Keep hook failures contained inside the hook.

## Live synchronization

The source database must already be registered by constructing a collection for it. The destination can be another local database name or a remote CouchDB-compatible URL.

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

Sync is live and retries by default. Pass PouchDB replication options in `options.opts`. See the [PouchDB replication guide](https://pouchdb.com/guides/replication.html) for authentication, filtering, and other advanced behavior.

## Custom IDs

Assign an `idGenerator` to a collection instance or override it in the subclass. It may be synchronous or asynchronous.

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

Direct document writes must preserve PouchORM's metadata, especially `$collectionType`, or collection queries will not return those documents.

## Destructive database operations

```ts
await PouchORM.clearDatabase("app-data"); // delete every document
await PouchORM.deleteDatabase("app-data"); // destroy and unregister the database
```

Both operations are irreversible. Existing collection instances should not be reused after `deleteDatabase`.

## Important bulk-operation behavior

`bulkUpsert` and `bulkRemove` are thin wrappers around PouchDB's `bulkDocs`:

- they return one PouchDB response or error per item, not hydrated documents;
- `bulkUpsert` adds PouchORM metadata but does not run class validation or merge callbacks;
- updates must include the current `_rev`, just as they do with `bulkDocs`;
- `bulkRemove` marks each supplied object as `_deleted`.

Use individual `upsert` calls when you need validation or merge behavior.

## Documentation

- [Complete API reference](docs/API.md)
- [Contributing guide](CONTRIBUTING.md)
- [PouchDB documentation](https://pouchdb.com/)

## License

[MIT](LICENSE)
