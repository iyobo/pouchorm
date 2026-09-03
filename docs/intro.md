---
title: Introduction
slug: /
hide_title: true
description: What PouchORM adds to PouchDB and when to use it.
---

# PouchORM

PouchORM adds typed models and named collections to PouchDB. It provides a consistent place for queries, writes, validation, change handlers, and database synchronization while leaving the underlying PouchDB database available for lower-level operations.

Use PouchORM when an application already uses PouchDB, or plans to use it, and would benefit from:

- several document types in one database;
- TypeScript types for those document types;
- one write path for metadata, validation, and conflict handling;
- collection-specific indexes and queries;
- hooks for changes to collection documents; or
- a registry for synchronization between local and remote databases.

PouchORM does not replace PouchDB's storage adapters, replication protocol, authentication, or authorization. Those remain application and PouchDB responsibilities.

## Supported environment

PouchORM 5 requires Node.js 20 or newer when used in Node. It is published as CommonJS with TypeScript declarations and supports the environments supported by the PouchDB build and adapters selected by the application.

## Start here

Follow [Getting started](getting-started.md) to install PouchORM and save the first document. The [API reference](API.md) lists every public method and type.

If an application uses PouchORM 4, read [Migrating to PouchORM 5](migrating-to-v5.md) before changing the installed version. Version 5 deliberately changes collection construction and several return types.
