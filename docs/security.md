---
title: Security
hide_title: true
description: Understand PouchORM's trust boundaries, supported versions, and security reporting process.
---

# Security

## Supported version

Security fixes are applied to the current major release. Upgrade to PouchORM 5 before reporting a problem already addressed by its release notes or migration guide.

The repository's [security policy](https://github.com/iyobo/pouchorm/security/policy) explains how to report a vulnerability privately.

## Application responsibilities

PouchORM organizes local database access. It does not provide:

- user authentication;
- authorization for a local or remote database;
- encryption for stored documents;
- secret storage;
- server-side access policy; or
- a tamper-resistant audit trail.

The `$by` field records the value most recently supplied through `PouchORM.setUser`. Treat it as application metadata, not verified identity.

When synchronizing with a remote database, use the authentication and transport controls supported by that server and PouchDB runtime. Do not put secrets into URLs that logs or error reports may capture.

## Dependency advisory

PouchDB 9 currently brings UUID 8 through several packages. npm reports [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) for those paths. The affected buffer-taking UUID APIs are not used by PouchORM or the inspected PouchDB paths. PouchORM's direct UUID dependency contains the fix.

The release audit permits only this reviewed advisory and fails if npm reports another dependency vulnerability. The assessment is revisited when PouchDB, `pouchdb-find`, or the advisory changes.
