---
id: intro
title: PouchORM 4
hide_title: true
description: Archived documentation for the unmaintained PouchORM 4 release line.
---

# PouchORM 4

This is the archived documentation for PouchORM 4. The 4.x release line is no longer maintained.

Install the final 4.x release with:

```sh
npm install pouchorm@4.1.4
```

PouchORM 4 adds TypeScript models, collection-style document grouping, Mango queries, optional class validation, change hooks, and synchronization helpers to PouchDB.

## Important collection-name behavior

PouchORM 4 stores the JavaScript collection class name in `$collectionType`. A production minifier can change that class name and separate documents that were intended to share a collection.

PouchORM 5 replaces that behavior with an explicit stable collection name. New applications should use 5.x. Existing applications should read the [PouchORM 5 migration guide](https://iyobo.github.io/pouchorm/docs/migrating-to-v5) before upgrading because collection identity and several APIs change.

## Continue with 4.x

- [Getting started](getting-started.md)
- [API reference](api-reference.md)
- [Validation](validation.md)
- [Synchronization](synchronization.md)
