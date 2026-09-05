---
title: Models and collections
hide_title: true
description: Define model metadata, stable collection names, indexes, and initialization hooks.
---

# Models and collections

## Model interfaces

Extend `IModel` when application code works with plain objects:

```ts
import { IModel } from "pouchorm";

interface Task extends IModel {
  title: string;
  completed: boolean;
}
```

`IModel` adds optional PouchDB and PouchORM fields. Application code normally supplies its own fields and lets the database write path populate the metadata.

| Field             | Meaning                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `_id`             | PouchDB document ID. PouchORM generates one when absent.           |
| `_rev`            | Current PouchDB revision.                                          |
| `_deleted`        | PouchDB deletion marker.                                           |
| `$timestamp`      | Millisecond timestamp assigned by the most recent PouchORM upsert. |
| `$collectionType` | Stable collection name.                                            |
| `$by`             | Most recent value supplied through `PouchORM.setUser`, or `...`.   |

`$by` is descriptive metadata. It does not authenticate a user and is not a tamper-resistant audit log.

## Class models

Extend `PouchModel` when models need constructors, methods, or `class-validator` decorators:

```ts
import { PouchModel } from "pouchorm";

interface TaskFields {
  title: string;
  completed: boolean;
}

class Task extends PouchModel<TaskFields> {
  title!: string;
  completed!: boolean;

  summary(): string {
    return this.completed ? `Done: ${this.title}` : this.title;
  }
}

const task = new Task({ title: "Review changes", completed: false });
```

Documents read from PouchDB are plain document objects. Construct a class instance explicitly when application methods are needed after a read.

## Collection options

```ts
class Tasks extends PouchCollection<Task> {
  constructor() {
    super({
      database: "app-data",
      // Keep this persisted value stable even if the class is renamed.
      collection: "tasks",
      pouch: { adapter: "idb" },
      validate: ClassValidate.INHERIT,
    });
  }
}
```

- `database` selects the PouchDB database.
- `collection` is saved in `$collectionType` and added to collection queries.
- `pouch` is passed to PouchDB when the named database is first opened.
- `validate` controls validation for this collection.

Collections with the same `database` value share one PouchDB database. Give each document type a different `collection` value. If several collections open the same database, only the first PouchDB options are used.

## Initialization and indexes

Collection operations wait for initialization. Override `beforeInit` to create indexes before the collection becomes ready:

```ts
async beforeInit(): Promise<void> {
  // Include each field used to filter or sort this query shape.
  await this.addIndex(["completed", "$timestamp"], "tasks-by-state");
}
```

PouchORM prefixes `$collectionType` to collection indexes. A failed initialization may be retried by the next operation.

Use `afterInit` for work that must run after all indexes exist. Avoid application writes in these hooks unless initialization cannot complete safely without them.

## Custom IDs

Set `idGenerator` when IDs need a stable application prefix or format:

```ts
type TaskId = `task:${string}`;

interface TaskWithId extends IModel<TaskId> {
  externalId: string;
  title: string;
}

class Tasks extends PouchCollection<TaskWithId, TaskId> {
  constructor() {
    super({ database: "app-data", collection: "tasks" });
  }

  idGenerator = (task?: TaskWithId): TaskId => {
    if (!task) throw new Error("Task data is required");
    // upsert calls this only when the document has no _id.
    return `task:${task.externalId}`;
  };
}
```

PouchORM uses a UUIDv7 string when no generator is configured. UUIDv7 values retain UUID uniqueness while sorting by their embedded creation time. An `_id` supplied to `upsert` always takes precedence, so existing IDs and application-defined ID formats continue to work.
