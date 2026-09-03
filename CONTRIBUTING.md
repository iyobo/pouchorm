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

Run the same verification used before publication:

```sh
npm run verify
```

This checks linting and formatting, builds the declarations, runs the Jest suite, packs the library, installs it in a clean consumer project, type-checks that project with strict settings, and exercises the installed package.

To inspect coverage locally:

```sh
npm test -- --runInBand --coverage
```

Most tests use the in-memory PouchDB adapter. Give new tests unique database names and destroy those databases in teardown so change listeners do not outlive the test suite.

## Pull requests

- Keep each pull request focused and explain the observable behavior it changes.
- Add a regression test for a bug fix and tests for new behavior.
- Update the documentation site and API reference when public behavior changes.
- Avoid committing generated `dist`, local database files, coverage output, or dependency directories.
- Call out compatibility or migration concerns in the pull request description.

## Project structure

- `src/PouchCollection.ts` implements collection queries, writes, indexes, and lifecycle hooks.
- `src/PouchORM.ts` coordinates databases, changes feeds, validation, and replication.
- `src/types.ts` contains public model types and enums.
- `src/tests` contains the Jest test suite.
- `scripts/test-package.mjs` verifies the package from a clean consumer's point of view.
- `docs/` contains the current major-version guides and API reference.
- `website/versioned_docs/` contains frozen documentation for older major versions.
- `MIGRATING_TO_V5.md` and `docs/migrating-to-v5.md` contain the same migration guide; the documentation build checks them for drift.
- `website/` contains the Docusaurus application and its compiled example checks.

## Reporting bugs

Open a GitHub issue with a small reproduction, the PouchORM and PouchDB versions involved, your runtime, and the behavior you expected.
