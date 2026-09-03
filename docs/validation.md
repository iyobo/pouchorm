---
title: Validation
hide_title: true
description: Register class-validator and choose global or collection-level validation behavior.
---

# Validation

PouchORM can run `class-validator` before writing class models. Validation is optional and disabled by default.

## Install and register the validator

```sh
npm install class-validator
```

Register the module once, before saving a validated model:

```ts
import * as classValidator from "class-validator";
import { PouchORM } from "pouchorm";

PouchORM.useClassValidator(classValidator);
```

PouchORM reports a configuration error if validation is enabled without this registration.

## Define a validated class

```ts
import { IsInt, IsString, Min } from "class-validator";
import { ClassValidate, PouchCollection, PouchModel } from "pouchorm";

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
```

Pass a class instance when saving so decorator metadata remains available:

```ts
await new People().upsert(new Person({ name: "Ada", age: 36 }));
```

## Choose a mode

| Mode            | Behavior                                                                              |
| --------------- | ------------------------------------------------------------------------------------- |
| `INHERIT`       | Use `PouchORM.VALIDATE`. This is the collection default.                              |
| `OFF`           | Do not validate, even when global validation is enabled.                              |
| `ON`            | Check the document and save it. Print errors only when diagnostic logging is enabled. |
| `ON_AND_LOG`    | Check the document, print validation errors, and save it.                             |
| `ON_AND_REJECT` | Reject an invalid document without saving it.                                         |

Set a global default when most collections share one mode:

```ts
PouchORM.VALIDATE = ClassValidate.ON_AND_REJECT;
```

Set a collection to `OFF` when it must opt out. Use `INHERIT` when it should follow the global setting.

Validation applies to `upsert` and every item passed to `bulkUpsert`.
