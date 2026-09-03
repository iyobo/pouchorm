# PouchORM

[![CI](https://github.com/iyobo/pouchorm/actions/workflows/main.yml/badge.svg)](https://github.com/iyobo/pouchorm/actions/workflows/main.yml)
[![npm](https://img.shields.io/npm/v/pouchorm.svg)](https://www.npmjs.com/package/pouchorm)
[![license](https://img.shields.io/npm/l/pouchorm.svg)](LICENSE)

PouchORM adds typed models and collections to PouchDB. You can keep several collections in one database, query them with Mango selectors, validate class models, respond to changes, and synchronize databases.

## Installation

Install PouchORM and its PouchDB peer dependency:

```sh
npm install pouchorm pouchdb
```

Install `class-validator` only when you use validation:

```sh
npm install class-validator
```

PouchORM 5 requires Node.js 20 or newer when used in Node. It is published as CommonJS with TypeScript declarations.

Upgrading from PouchORM 4? Read [Migrating to PouchORM 5](MIGRATING_TO_V5.md).

## Quick start

Define a model and give its collection a stable name. That name is stored with every document, so it must not depend on a JavaScript class name that a production build can change.

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

Create, find, update, and remove documents:

```ts
const ada = await people.upsert({
  name: "Ada Lovelace",
  age: 36,
});

const adults = await people.find(
  { age: { $gte: 18 } },
  { sort: [{ age: "desc" }] },
);

const updatedAda = await people.upsert({ ...ada, age: 37 });
await people.remove(updatedAda);
```

`upsert` returns the saved document, including `_id`, `_rev`, `$timestamp`, `$collectionType`, and `$by`.

## Collections and databases

The constructor options are:

```ts
super({
  database: "app-data",
  collection: "people",
  pouch: { adapter: "idb" },
  validate: ClassValidate.INHERIT,
});
```

- `database` selects the PouchDB database.
- `collection` is the stable name stored in `$collectionType`.
- `pouch` is passed to PouchDB when the database is first opened.
- `validate` controls validation for this collection.

Collections with the same `database` value share one PouchDB database. Each collection needs a different `collection` value. Only the first set of PouchDB options is used when several collections open the same database.

## Updating documents

An update replaces the stored fields while retaining the latest `_rev`. To preserve fields that are not in your update, use `UpsertHelper(...).merge`:

```ts
import { UpsertHelper } from "pouchorm";

const patch: Person = {
  _id: ada._id,
  name: "Ada Byron",
  age: 37,
};

const merged = await people.upsert(patch, UpsertHelper(patch).merge);
```

If another writer changes the document between the read and write, PouchORM reads the latest revision and tries again. After five conflicts, it returns the PouchDB conflict error.

`findOne` and `findById` return `null` when no matching document exists. Their `OrFail` variants throw instead.

## Bulk writes

`bulkUpsert` applies the same ID generation, validation, update, and conflict handling as `upsert`, then returns the saved documents:

```ts
const saved = await people.bulkUpsert([
  { name: "Grace Hopper", age: 85 },
  { name: "Evelyn Boyd Granville", age: 99 },
]);
```

`bulkRemove` deletes an array of saved documents and returns the PouchDB result for each document. It does not change the objects you pass to it.

## Class models and validation

Extend `PouchModel` when you use `class-validator` decorators:

```ts
import * as classValidator from "class-validator";
import { IsInt, IsString, Min } from "class-validator";
import { ClassValidate, PouchCollection, PouchModel, PouchORM } from "pouchorm";

PouchORM.useClassValidator(classValidator);

class Person extends PouchModel<Person> {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  age!: number;
}

class People extends PouchCollection<Person> {
  constructor() {
    super({
      database: "app-data",
      collection: "people",
      validate: ClassValidate.ON_AND_REJECT,
    });
  }
}

await new People().upsert(new Person({ name: "Ada", age: 36 }));
```

Validation applies to both `upsert` and `bulkUpsert`. A collection set to `ClassValidate.OFF` remains unvalidated even when global validation is enabled. Use `ClassValidate.INHERIT` to follow `PouchORM.VALIDATE`.

PouchORM reports a clear error if validation is enabled before a validator is configured.

## Responding to changes

Override the hooks you need:

```ts
class People extends PouchCollection<Person> {
  constructor() {
    super({ database: "app-data", collection: "people" });
  }

  async onChangeUpserted(person: Person): Promise<void> {
    console.log("Changed:", person._id);
  }

  async onChangeDeleted(person: Person): Promise<void> {
    console.log("Deleted:", person._id);
  }

  async onChangeError(error: Error): Promise<void> {
    console.error("Change handler failed:", error);
  }
}
```

The database operation can finish before its hook finishes. If an upsert or delete hook rejects, PouchORM passes that error to `onChangeError`.

## Synchronizing databases

`startSync` returns the PouchDB synchronization handle. The source database is opened automatically if needed.

```ts
import { PouchORM } from "pouchorm";

const operation = PouchORM.startSync(
  "local-data",
  "https://example.com/app-data",
  {
    options: { batch_size: 100 },
    onChange(change) {
      console.log("Sync direction:", change.direction);
    },
    onError(error) {
      console.error("Sync failed:", error);
    },
  },
);

operation.cancel();
// or
PouchORM.stopSync("local-data", "https://example.com/app-data");
```

When the destination is a local database name, PouchORM opens or reuses it with the configured adapter. An HTTP or HTTPS destination is passed to PouchDB as a remote address. Calling `startSync` again for the same pair cancels and replaces the earlier operation. Stopping or completing an operation removes it from PouchORM's registry.

See the [PouchDB replication guide](https://pouchdb.com/guides/replication.html) for authentication, filters, and other replication options.

## Custom IDs

Set `idGenerator` on the collection. It may return immediately or return a promise.

```ts
type PersonId = `person:${string}`;

interface PersonWithCustomId extends IModel<PersonId> {
  name: string;
}

class PeopleWithCustomIds extends PouchCollection<
  PersonWithCustomId,
  PersonId
> {
  constructor() {
    super({ database: "app-data", collection: "people" });
  }

  idGenerator = (): PersonId => `person:${crypto.randomUUID()}`;
}
```

The default is a UUID string.

## Direct PouchDB access

Every collection exposes its database as `collection.db`:

```ts
await people.db.putAttachment(
  ada._id!,
  "avatar.png",
  ada._rev!,
  avatarBlob,
  "image/png",
);
```

PouchDB is a peer dependency, so your application and PouchORM use the same constructor. Add plugins through `PouchORM.PouchDB`:

```ts
PouchORM.PouchDB.plugin(myPlugin);
```

Call `PouchORM.usePouchDB(customConstructor)` before opening any database when you use a custom PouchDB build.

When writing through the raw API, set `$collectionType` to `collection.collectionName`. PouchORM queries ignore documents with another collection name.

## Clearing or deleting a database

```ts
await PouchORM.clearDatabase("app-data");
await PouchORM.deleteDatabase("app-data");
```

`clearDatabase` removes application documents but preserves design documents and indexes, so existing collections remain usable. `deleteDatabase` stops change notifications and every synchronization involving that database, destroys it, and unregisters it. Do not reuse collection instances after deletion.

Both operations permanently remove data.

## Documentation

- [API reference](docs/API.md)
- [Migrating to PouchORM 5](MIGRATING_TO_V5.md)
- [Contributing](CONTRIBUTING.md)
- [PouchDB documentation](https://pouchdb.com/)

## License

[MIT](LICENSE)
