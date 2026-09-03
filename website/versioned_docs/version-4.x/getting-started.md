---
id: getting-started
title: Getting started with 4.x
hide_title: true
description: Install PouchORM 4, define a model, and work with documents.
---

# Getting started with 4.x

:::warning Archived release

This page describes PouchORM 4.1.4. It does not apply to PouchORM 5.

:::

## Install

```sh
npm install pouchorm@4.1.4
```

PouchORM 4 includes PouchDB as a direct dependency. Install `class-validator` separately only when validation is enabled.

## Define a model and collection

```ts
import { IModel, PouchCollection } from "pouchorm";

interface Person extends IModel {
  name: string;
  age: number;
}

class PersonCollection extends PouchCollection<Person> {
  async beforeInit(): Promise<void> {
    await this.addIndex(["age"]);
  }
}

const people = new PersonCollection("app-data");
```

The constructor accepts the database name, optional PouchDB configuration, and an optional validation mode:

```ts
new PersonCollection(
  "app-data",
  { adapter: "idb" },
  ClassValidate.ON_AND_REJECT,
);
```

PouchORM 4 derives `$collectionType` from `PersonCollection.name`. Production minification can change that value. Avoid renaming or separately minifying collection classes that must read the same data.

## Save and query

```ts
let ada = await people.upsert({
  name: "Ada Lovelace",
  age: 36,
});

ada.age = 37;
ada = await people.upsert(ada);

const matches = await people.find({ age: 37 });
```

`upsert` adds metadata to the supplied object in 4.x. `findOne` and `findById` may return `null` at runtime even though the 4.x declarations omit it.

## Upgrade

Version 5 corrects these behaviors and requires application changes. Follow the [PouchORM 5 migration guide](https://iyobo.github.io/pouchorm/docs/migrating-to-v5).
