# Changelog

## 5.0.0 — 2026-09-03

### Correctness

- Require an explicit collection name so production minification cannot change `$collectionType`.
- Keep Mango query requests free of undefined options, fixing collection-wide queries with PouchDB Find 9.
- Support ascending and descending Mango sort objects and add the collection field required by collection indexes.
- Retry upserts after revision conflicts and stop mutating documents supplied to write methods.
- Apply normal upsert and validation behavior to `bulkUpsert`.
- Require explicit validator registration so optional validation works predictably in Node and browser bundles.
- Preserve design documents and indexes when clearing application data.
- Send rejected change hooks and synchronization callbacks to their error handlers.
- Return synchronization handles, remove stopped handles from the registry, and cancel both incoming and outgoing synchronization before database deletion.
- Reuse already-open local database instances during synchronization.

### Package and types

- Publish self-contained PouchDB-facing declarations instead of relying on the global `PouchDB` namespace.
- Correct nullable query return types and generic model types.
- Use PouchDB as a peer dependency so the application and PouchORM share one constructor and plugin registry.
- Align `pouchdb-find` with PouchDB 9, update the direct UUID dependency, and make `class-validator` an optional peer.
- Remove unused runtime dependencies and require Node.js 20 or newer for Node applications.

### Development

- Make linting inspect the TypeScript source and run it before publication.
- Verify the packed npm artifact in a clean strict TypeScript consumer.
- Use npm as the repository's package manager and remove the Yarn lockfile.
- Replace slow filesystem-backed unit tests with the in-memory adapter where possible.

See [Migrating to PouchORM 5](MIGRATING_TO_V5.md) for application changes.
