export interface IModel<IDType extends string = string> {
  _id?: IDType;
  _rev?: string;
  _deleted?: boolean;
  $timestamp?: number;
  $collectionType?: string;
  /** The user ID supplied through `PouchORM.setUser`. */
  $by?: string;
}

export enum CollectionState {
  NEW = "new",
  LOADING = "loading",
  READY = "ready",
}

export enum ClassValidate {
  INHERIT = "inherit",
  OFF = "off",
  ON = "on",
  ON_AND_LOG = "on-and-log",
  ON_AND_REJECT = "on-and-reject",
}

export interface ClassValidator {
  validate(item: object): Promise<unknown[]>;
  validateOrReject(item: object): Promise<void>;
}

export interface PouchDatabaseConfiguration {
  adapter?: string;
  [option: string]: unknown;
}

export interface PouchCollectionOptions {
  /** The local PouchDB database name. */
  database: string;
  /** A stable value stored in `$collectionType`. */
  collection: string;
  /** Options passed to the PouchDB constructor. */
  pouch?: PouchDatabaseConfiguration;
  /** The validation behavior for this collection. */
  validate?: ClassValidate;
}

export type CollectionSort<T> = Array<
  | Extract<keyof T, string>
  | Partial<Record<Extract<keyof T, string>, "asc" | "desc">>
>;

export interface PouchWriteResult {
  ok: boolean;
  id: string;
  rev: string;
}

export interface PouchOperationError {
  error?: string | boolean;
  id?: string;
  name?: string;
  reason?: string;
  status?: number;
  [property: string]: unknown;
}

export type PouchBulkResult = PouchWriteResult | PouchOperationError;

export interface PouchFindRequest<Model extends object> {
  selector: Record<string, unknown>;
  fields?: string[];
  sort?: CollectionSort<Model>;
  limit?: number;
  skip?: number;
  use_index?: string | [string, string];
}

export interface PouchFindResponse<Model extends object> {
  docs: Array<Model & { _id: string; _rev: string }>;
}

export interface PouchIndexResponse {
  id: string;
  name: string;
  result: "created" | "exists";
}

export interface PouchChange<Model extends object> {
  id: string;
  deleted?: boolean;
  doc?: Model;
  [property: string]: unknown;
}

export interface PouchChanges<Model extends object> {
  on(event: "change", listener: (change: PouchChange<Model>) => void): this;
  on(event: "error", listener: (error: unknown) => void): this;
  cancel(): void;
}

export interface PouchSyncOptions {
  live?: boolean;
  retry?: boolean;
  [option: string]: unknown;
}

export interface SyncResult<Model extends object = IModel> {
  direction: "push" | "pull";
  change: {
    docs?: Model[];
    [property: string]: unknown;
  };
  [property: string]: unknown;
}

export interface SyncComplete<Model extends object = IModel> {
  push?: unknown;
  pull?: unknown;
  docs?: Model[];
  [property: string]: unknown;
}

export interface Sync<Model extends object = IModel> extends PromiseLike<
  SyncComplete<Model>
> {
  on(event: "change", listener: (change: SyncResult<Model>) => void): this;
  on(event: "paused", listener: (info: unknown) => void): this;
  on(event: "active", listener: () => void): this;
  on(event: "denied", listener: (error: unknown) => void): this;
  on(event: "complete", listener: (info: unknown) => void): this;
  on(event: "error", listener: (error: unknown) => void): this;
  cancel(): void;
}

export interface PouchDatabase<Model extends object = IModel> {
  get<Document extends Model = Model>(
    id: string,
  ): Promise<Document & { _id: string; _rev: string }>;
  put<Document extends Model = Model>(
    document: Document,
  ): Promise<PouchWriteResult>;
  remove(id: string, revision: string): Promise<PouchWriteResult>;
  putAttachment(
    documentId: string,
    attachmentId: string,
    revision: string,
    data: Blob | ArrayBuffer | Uint8Array,
    contentType: string,
  ): Promise<PouchWriteResult>;
  getAttachment(
    documentId: string,
    attachmentId: string,
  ): Promise<Blob | Uint8Array>;
  removeAttachment(
    documentId: string,
    attachmentId: string,
    revision: string,
  ): Promise<PouchWriteResult>;
  bulkDocs<Document extends object = Model>(
    documents: Document[],
  ): Promise<PouchBulkResult[]>;
  allDocs(): Promise<{
    rows: Array<{ id: string; value: { rev: string } }>;
  }>;
  find(request: PouchFindRequest<Model>): Promise<PouchFindResponse<Model>>;
  createIndex(options: {
    index: { fields: string[]; name?: string };
  }): Promise<PouchIndexResponse>;
  deleteIndex(index: { ddoc: string; name: string }): Promise<unknown>;
  changes<Document extends object = Model>(options: {
    live: boolean;
    since: "now" | number | string;
    include_docs: boolean;
  }): PouchChanges<Document>;
  sync<Document extends object = Model>(
    target: string | PouchDatabase<Document>,
    options?: PouchSyncOptions,
  ): Sync<Document>;
  destroy(): Promise<void>;
}

export interface PouchDBConstructor {
  new <Model extends object = IModel>(
    name: string,
    options?: PouchDatabaseConfiguration,
  ): PouchDatabase<Model>;
  plugin(plugin: unknown): PouchDBConstructor;
}

export abstract class PouchModel<
  T,
  IDType extends string = string,
> implements IModel<IDType> {
  constructor(item: T) {
    Object.assign(this, item);
  }

  _id?: IDType;
  _rev?: string;
  _deleted?: boolean;
  $timestamp?: number;
  $collectionType?: string;
  /** The user ID supplied through `PouchORM.setUser`. */
  $by?: string;
}
