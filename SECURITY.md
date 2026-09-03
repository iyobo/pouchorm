# Security

## Supported versions

Security fixes are applied to the current major release. Upgrade to PouchORM 5 before reporting a problem that is already addressed by its release notes.

## Dependency audit note

As of September 3, 2026, `npm audit` reports the [`uuid` buffer bounds advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) through PouchDB 9 and its packages.

The advisory affects UUID versions 3, 5, and 6 when a caller supplies a buffer. PouchORM uses UUID version 4 without a supplied buffer. The installed PouchDB 9 code also uses version 4 without a supplied buffer. The reported path is therefore not exercised by PouchORM or the PouchDB code it calls.

PouchORM's direct UUID dependency is version 11.1.1 or newer, which contains the bounds fix. The remaining package-range warning cannot be removed from a published PouchORM dependency graph until the PouchDB packages update their UUID dependency. The release check permits only this reviewed advisory and fails when `npm audit` reports anything else.

This assessment should be revisited whenever PouchDB, `pouchdb-find`, or the UUID advisory changes.
