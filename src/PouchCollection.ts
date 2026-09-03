import { v4 as uuid } from "uuid";
import { PouchORM } from "./PouchORM";
import {
  ClassValidate,
  CollectionSort,
  CollectionState,
  IModel,
  PouchBulkResult,
  PouchCollectionOptions,
  PouchDatabase,
  PouchFindRequest,
  PouchFindResponse,
  PouchIndexResponse,
} from "./types";

const MAX_UPSERT_ATTEMPTS = 5;

function isPouchError(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === status
  );
}

export abstract class PouchCollection<
  T extends IModel<IDType>,
  IDType extends string = string,
> {
  state = CollectionState.NEW;
  private initPromise?: Promise<void>;

  readonly databaseName: string;
  readonly collectionName: string;
  readonly db: PouchDatabase<T>;
  readonly validate: ClassValidate;

  readonly indexes: Array<{
    fields: Array<keyof T>;
    name?: string;
    indexId: string;
  }> = [];

  idGenerator?: (item?: T) => IDType | Promise<IDType>;

  constructor(options: PouchCollectionOptions) {
    if (
      !options ||
      typeof options.database !== "string" ||
      options.database.trim() === ""
    ) {
      throw new Error("PouchCollection requires a non-empty database name.");
    }
    if (
      typeof options.collection !== "string" ||
      options.collection.trim() === ""
    ) {
      throw new Error(
        "PouchCollection requires a stable, non-empty collection name.",
      );
    }

    this.databaseName = options.database;
    this.collectionName = options.collection;
    this.validate = options.validate ?? ClassValidate.INHERIT;
    this.db = PouchORM.ensureDatabase<T>(options.database, this, options.pouch);

    if (PouchORM.LOGGING)
      console.log("Initializing collection:", this.collectionName);
  }

  async checkInit(): Promise<void> {
    if (this.state === CollectionState.READY) return;

    if (!this.initPromise) {
      this.initPromise = this.runInit().catch((error) => {
        this.state = CollectionState.NEW;
        this.initPromise = undefined;
        throw error;
      });
    }

    return this.initPromise;
  }

  /** Override to create collection-specific indexes before initialization finishes. */
  async beforeInit(): Promise<void> {}

  /** Override to run work after all collection indexes have been created. */
  async afterInit(): Promise<void> {}

  private async runInit(): Promise<void> {
    this.state = CollectionState.LOADING;

    await this.beforeInit();
    await this.addIndex([]);
    await this.addIndex(["$timestamp"]);
    await this.afterInit();

    this.state = CollectionState.READY;
  }

  async addIndex(
    fields: Array<keyof T>,
    name?: string,
  ): Promise<PouchIndexResponse> {
    const indexFields = [
      "$collectionType",
      ...fields.filter((field) => field !== "$collectionType"),
    ] as Array<keyof T>;

    const response = await this.db.createIndex({
      index: {
        fields: indexFields as string[],
        name,
      },
    });

    this.indexes.push({
      fields: indexFields,
      name,
      indexId: (response as unknown as { id: string }).id,
    });

    return response;
  }

  async removeIndex(name: string): Promise<boolean> {
    const index = this.indexes.findIndex((item) => item.name === name);
    if (index < 0) return false;

    await this.db.deleteIndex({
      ddoc: this.indexes[index].indexId,
      name,
    });
    this.indexes.splice(index, 1);
    return true;
  }

  async find(
    selector: Partial<T> | Record<string, unknown> = {},
    options?: { sort?: CollectionSort<T>; limit?: number },
  ): Promise<T[]> {
    await this.checkInit();

    const request: PouchFindRequest<T> = {
      selector: {
        ...selector,
        $collectionType: this.collectionName,
      },
    };
    if (options?.sort?.length) {
      const directions = options.sort.map((field) => {
        if (typeof field === "string") return "asc";
        const entries = Object.entries(field);
        if (entries.length !== 1) {
          throw new Error("Each sort object must contain exactly one field.");
        }
        return entries[0][1];
      });
      const direction = directions[0];
      if (directions.some((item) => item !== direction)) {
        throw new Error(
          "PouchDB requires every sort field to use the same direction.",
        );
      }
      request.sort = [
        direction === "desc"
          ? ({ $collectionType: "desc" } as CollectionSort<T>[number])
          : ("$collectionType" as Extract<keyof T, string>),
        ...options.sort.filter((field) => {
          return typeof field === "string"
            ? field !== "$collectionType"
            : !("$collectionType" in field);
        }),
      ];
    }
    if (options?.limit !== undefined) request.limit = options.limit;

    const response = (await this.db.find(request)) as PouchFindResponse<T>;

    return response.docs as T[];
  }

  async findOne(
    selector: Partial<T> | Record<string, unknown>,
  ): Promise<T | null> {
    const matches = await this.find(selector, { limit: 1 });
    return matches[0] ?? null;
  }

  async findOrFail(
    selector: Partial<T> | Record<string, unknown> = {},
    options?: { sort?: CollectionSort<T>; limit?: number },
  ): Promise<T[]> {
    const documents = await this.find(selector, options);
    if (documents.length === 0) {
      throw new Error(
        `${this.collectionName} matching ${JSON.stringify(selector)} does not exist.`,
      );
    }
    return documents;
  }

  async findOneOrFail(
    selector: Partial<T> | Record<string, unknown>,
  ): Promise<T> {
    const matches = await this.findOrFail(selector, { limit: 1 });
    return matches[0];
  }

  async findById(id: IDType): Promise<T | null> {
    if (!id) return null;
    await this.checkInit();

    try {
      const document = await this.db.get<T>(id);
      return document.$collectionType === this.collectionName
        ? (document as T)
        : null;
    } catch (error) {
      if (isPouchError(error, 404)) return null;
      throw error;
    }
  }

  async findByIdOrFail(id: IDType): Promise<T> {
    const document = await this.findById(id);
    if (!document)
      throw new Error(`${this.collectionName} with id ${id} does not exist.`);
    return document;
  }

  async removeById(id: IDType): Promise<boolean> {
    const document = await this.findById(id);
    if (!document) return false;
    await this.remove(document);
    return true;
  }

  async remove(item: T): Promise<void> {
    if (!item?._id || !item._rev) {
      throw new Error("Removing a document requires both _id and _rev.");
    }
    await this.db.remove(item._id, item._rev);
  }

  private cloneModel(item: T): T {
    return Object.assign(Object.create(Object.getPrototypeOf(item)), item);
  }

  private prepareDocument(item: T, id: IDType, revision?: string): T {
    const document = this.cloneModel(item);
    document._id = id;
    if (revision) document._rev = revision;
    else delete document._rev;
    document.$timestamp = Date.now();
    document.$collectionType = this.collectionName;
    document.$by = PouchORM.userId ?? "...";
    return document;
  }

  private validationMode(): ClassValidate {
    return this.validate === ClassValidate.INHERIT
      ? PouchORM.VALIDATE
      : this.validate;
  }

  private async validateDocument(item: T): Promise<void> {
    const mode = this.validationMode();
    if (mode === ClassValidate.OFF || mode === ClassValidate.INHERIT) return;

    const classValidator = PouchORM.getClassValidator();
    if (mode === ClassValidate.ON_AND_REJECT) {
      await classValidator.validateOrReject(item);
      return;
    }

    const errors = await classValidator.validate(item);
    if (mode === ClassValidate.ON_AND_LOG || PouchORM.LOGGING) {
      console.log(`Validation errors for ${this.collectionName}:`, errors);
    }
  }

  async upsert(item: T, delta?: (existing: T) => T): Promise<T> {
    const id =
      item._id ?? (await this.idGenerator?.(item)) ?? (uuid() as IDType);
    if (typeof id !== "string" || id.length === 0) {
      throw new Error("A document ID must be a non-empty string.");
    }

    for (let attempt = 1; attempt <= MAX_UPSERT_ATTEMPTS; attempt += 1) {
      const existing = await this.findById(id);
      const candidate = existing
        ? delta
          ? delta(existing)
          : this.cloneModel(item)
        : this.cloneModel(item);

      await this.validateDocument(candidate);
      const document = this.prepareDocument(candidate, id, existing?._rev);

      try {
        const response = await this.db.put(document);
        return {
          ...document,
          _id: response.id as IDType,
          _rev: response.rev,
        };
      } catch (error) {
        if (!isPouchError(error, 409) || attempt === MAX_UPSERT_ATTEMPTS)
          throw error;
      }
    }

    throw new Error(
      `Unable to save ${this.collectionName} after ${MAX_UPSERT_ATTEMPTS} attempts.`,
    );
  }

  async bulkUpsert(items: T[]): Promise<T[]> {
    const saved: T[] = [];
    for (const item of items) saved.push(await this.upsert(item));
    return saved;
  }

  async bulkRemove(items: T[]): Promise<PouchBulkResult[]> {
    const deleted = items.map((item) => ({ ...item, _deleted: true }));
    return this.db.bulkDocs(deleted);
  }

  async onChangeUpserted(_item: T): Promise<void> {}

  async onChangeDeleted(_item: T): Promise<void> {}

  async onChangeError(_error: Error): Promise<void> {}
}
