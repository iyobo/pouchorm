declare module "pouchdb" {
  const PouchDB: import("./types").PouchDBConstructor;
  export default PouchDB;
}

declare module "pouchdb-find" {
  const plugin: unknown;
  export default plugin;
}

declare module "pouchdb-adapter-memory" {
  const plugin: unknown;
  export default plugin;
}
