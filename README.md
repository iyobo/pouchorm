# PouchORM

[![CI](https://github.com/iyobo/pouchorm/actions/workflows/main.yml/badge.svg)](https://github.com/iyobo/pouchorm/actions/workflows/main.yml)
[![npm](https://img.shields.io/npm/v/pouchorm.svg)](https://www.npmjs.com/package/pouchorm)
[![license](https://img.shields.io/npm/l/pouchorm.svg)](LICENSE)

PouchORM adds typed models and named collections to PouchDB. It provides query and write helpers, optional class validation, change hooks, and synchronization management while keeping the underlying PouchDB database available.

[Read the documentation](https://iyobo.github.io/pouchorm/) or [open the API reference](https://iyobo.github.io/pouchorm/docs/api-reference).

## Installation

Install PouchORM and its PouchDB peer dependency:

```sh
npm install pouchorm pouchdb
```

Install `class-validator` only when the application uses validation:

```sh
npm install class-validator
```

PouchORM 5 requires Node.js 20 or newer when used in Node. It is published as CommonJS with TypeScript declarations.

## Quick start

Define a model and give its collection a stable name:

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

Create, query, update, and remove documents:

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

The `collection` value is stored in `$collectionType` on every document. Keep it stable across builds and releases; production minification must not determine persisted collection identity.

## Documentation

- [Getting started](https://iyobo.github.io/pouchorm/docs/getting-started)
- [Models and collections](https://iyobo.github.io/pouchorm/docs/models-and-collections)
- [Querying](https://iyobo.github.io/pouchorm/docs/querying)
- [Creating and updating documents](https://iyobo.github.io/pouchorm/docs/writes)
- [Validation](https://iyobo.github.io/pouchorm/docs/validation)
- [Synchronization](https://iyobo.github.io/pouchorm/docs/synchronization)
- [API reference](https://iyobo.github.io/pouchorm/docs/api-reference)
- [Migrating from PouchORM 4](https://iyobo.github.io/pouchorm/docs/migrating-to-v5)
- [Archived PouchORM 4 documentation](https://iyobo.github.io/pouchorm/docs/4.x/intro)

The current documentation is maintained for 5.x. The frozen 4.x documentation is retained for applications that have not migrated.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report security problems using the process in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
