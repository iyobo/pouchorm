---
id: validation
title: Validation in 4.x
hide_title: true
description: Archived class-validator setup and behavior in PouchORM 4.1.4.
---

# Validation in 4.x

Install `class-validator` when validation is enabled:

```sh
npm install class-validator
```

Use a class extending `PouchModel` so decorator metadata is present:

```ts
import { IsNumber, IsString } from "class-validator";
import { ClassValidate, PouchCollection, PouchModel } from "pouchorm";

class Person extends PouchModel<Person> {
  @IsString()
  name!: string;

  @IsNumber()
  age!: number;
}

class PersonCollection extends PouchCollection<Person> {}

const people = new PersonCollection(
  "app-data",
  undefined,
  ClassValidate.ON_AND_REJECT,
);
```

The 4.x modes are `OFF`, `ON`, `ON_AND_LOG`, and `ON_AND_REJECT`. A global non-`OFF` value in `PouchORM.VALIDATE` takes effect when a collection is configured as `OFF`; 4.x cannot use collection-level `OFF` to override enabled global validation.

Validation applies to `upsert`, not `bulkUpsert`, in 4.x.

PouchORM 5 adds explicit validator registration, validation inheritance, and bulk validation. See the [migration guide](https://iyobo.github.io/pouchorm/docs/migrating-to-v5).
