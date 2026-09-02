# Contributing to PouchORM

Thanks for helping improve PouchORM. Bug fixes, documentation improvements, and focused feature proposals are welcome.

## Local setup

Use Node.js 20 and npm for the same path exercised by continuous integration.

```sh
git clone https://github.com/iyobo/pouchorm.git
cd pouchorm
npm ci
```

## Build and test

Run the TypeScript build and the test suite before opening a pull request:

```sh
npm run build
npm test -- --runInBand
```

To inspect coverage locally:

```sh
npm test -- --runInBand --coverage
```

Tests use local PouchDB databases. Give new tests unique database names and destroy those databases in teardown so live changes feeds do not outlive the test suite.

## Pull requests

- Keep each pull request focused and explain the observable behavior it changes.
- Add a regression test for a bug fix and tests for new behavior.
- Update the README or API reference when public behavior changes.
- Avoid committing generated `dist`, local database files, coverage output, or dependency directories.
- Call out compatibility or migration concerns in the pull request description.

## Project structure

- `src/PouchCollection.ts` implements collection queries, writes, indexes, and lifecycle hooks.
- `src/PouchORM.ts` coordinates databases, changes feeds, validation, and replication.
- `src/types.ts` contains public model types and enums.
- `src/tests` contains the Jest test suite.
- `docs/API.md` is the public API reference.

## Reporting bugs

Open a GitHub issue with a small reproduction, the PouchORM and PouchDB versions involved, your runtime, and the behavior you expected.
