import { getPouchDBWithPlugins } from "./helpers";
import { PouchCollection } from "./PouchCollection";
import {
  ClassValidator,
  ClassValidate,
  IModel,
  PouchBulkResult,
  PouchChanges,
  PouchDatabase,
  PouchDatabaseConfiguration,
  PouchDBConstructor,
  PouchSyncOptions,
  Sync,
  SyncResult,
} from "./types";

interface DatabaseRegistration {
  db: PouchDatabase<IModel>;
  changeListener?: PouchChanges<IModel>;
  collections: Set<PouchCollection<any>>;
}

export interface ORMSyncOptions<Model extends object = IModel> {
  options?: PouchSyncOptions;
  onChange?: (change: SyncResult<Model>) => unknown;
  onPaused?: (info: unknown) => unknown;
  onActive?: () => unknown;
  onDenied?: (error: unknown) => unknown;
  onComplete?: (info: unknown) => unknown;
  onError?: (error: unknown) => unknown;
}

export class PouchORM {
  private static readonly databases = new Map<string, DatabaseRegistration>();
  private static readonly syncOperations = new Map<
    string,
    Map<string, Sync<IModel>>
  >();
  private static classValidator?: ClassValidator;

  static LOGGING = false;
  static VALIDATE = ClassValidate.OFF;
  static PouchDB: PouchDBConstructor = getPouchDBWithPlugins();
  static userId?: string;
  static adapter?: string;

  /**
   * Use a custom PouchDB constructor. Call this before opening a database.
   * PouchORM installs the find plugin on the supplied constructor.
   */
  static usePouchDB(pouchDB: PouchDBConstructor): void {
    if (PouchORM.databases.size > 0) {
      throw new Error(
        "A custom PouchDB constructor must be configured before opening a database.",
      );
    }
    if (!pouchDB || typeof pouchDB.plugin !== "function") {
      throw new Error(
        "The supplied PouchDB constructor does not support plugins.",
      );
    }
    PouchORM.PouchDB = getPouchDBWithPlugins(pouchDB);
  }

  static useClassValidator(classValidator: ClassValidator): void {
    if (
      !classValidator ||
      typeof classValidator.validate !== "function" ||
      typeof classValidator.validateOrReject !== "function"
    ) {
      throw new Error(
        "The supplied validator must provide validate and validateOrReject functions.",
      );
    }
    PouchORM.classValidator = classValidator;
  }

  static openDatabase(
    databaseName: string,
    options?: PouchDatabaseConfiguration,
  ): PouchDatabase<IModel> {
    if (!databaseName || databaseName.trim() === "") {
      throw new Error("PouchORM requires a non-empty database name.");
    }

    if (!PouchORM.databases.has(databaseName)) {
      const db = new PouchORM.PouchDB(databaseName, {
        ...(PouchORM.adapter ? { adapter: PouchORM.adapter } : {}),
        ...options,
      });

      PouchORM.databases.set(databaseName, {
        db,
        collections: new Set(),
      });
      PouchORM.beginChangeListener(databaseName);
    }

    return PouchORM.databases.get(databaseName)!.db;
  }

  static ensureDatabase<Model extends IModel>(
    databaseName: string,
    collection: PouchCollection<Model>,
    options?: PouchDatabaseConfiguration,
  ): PouchDatabase<Model> {
    const database = PouchORM.openDatabase(databaseName, options);
    PouchORM.databases.get(databaseName)!.collections.add(collection);
    return database as PouchDatabase<Model>;
  }

  private static createChangeListener(
    databaseName: string,
  ): PouchChanges<IModel> {
    const registration = PouchORM.databases.get(databaseName);
    if (!registration) {
      throw new Error(
        `Cannot listen to a database that has not been opened: ${databaseName}`,
      );
    }

    const listener = registration.db.changes<IModel>({
      live: true,
      since: "now",
      include_docs: true,
    });

    listener.on("change", (change) => {
      const document = change.doc;
      if (!document) return;

      registration.collections.forEach((collection) => {
        if (document.$collectionType !== collection.collectionName) return;
        void Promise.resolve()
          .then(() => {
            return change.deleted
              ? collection.onChangeDeleted(document)
              : collection.onChangeUpserted(document);
          })
          .catch((error) => {
            PouchORM.reportCollectionError(collection, error);
          });
      });
    });
    listener.on("error", (error) => {
      if (registration.changeListener === listener) {
        registration.changeListener = undefined;
      }
      registration.collections.forEach((collection) => {
        PouchORM.reportCollectionError(collection, error);
      });
    });

    return listener;
  }

  private static reportCollectionError(
    collection: PouchCollection<any>,
    error: unknown,
  ): void {
    const normalized =
      error instanceof Error ? error : new Error(String(error));
    void Promise.resolve()
      .then(() => collection.onChangeError(normalized))
      .catch(() => {
        if (PouchORM.LOGGING) {
          console.error(
            `The error handler for collection ${collection.collectionName} failed.`,
          );
        }
      });
  }

  static beginChangeListener(databaseName: string): void {
    const registration = PouchORM.databases.get(databaseName);
    if (!registration) {
      throw new Error(
        `Cannot listen to a database that has not been opened: ${databaseName}`,
      );
    }
    if (!registration.changeListener) {
      registration.changeListener = PouchORM.createChangeListener(databaseName);
    }
  }

  static stopChangeListener(databaseName: string): boolean {
    const registration = PouchORM.databases.get(databaseName);
    if (!registration?.changeListener) return false;
    registration.changeListener.cancel();
    registration.changeListener = undefined;
    return true;
  }

  static setUser(userId?: string): void {
    PouchORM.userId = userId;
  }

  static getActiveSync<Model extends object = IModel>(
    fromDatabase: string,
    toDatabase: string,
  ): Sync<Model> | undefined {
    return PouchORM.syncOperations.get(fromDatabase)?.get(toDatabase) as
      Sync<Model> | undefined;
  }

  private static invokeCallback<T>(
    callback: ((value: T) => unknown) | undefined,
    value: T,
    onError?: (error: unknown) => unknown,
  ): void {
    if (!callback) return;

    try {
      void Promise.resolve(callback(value)).catch((error) => {
        if (onError && callback !== onError)
          PouchORM.invokeCallback(onError, error);
      });
    } catch (error) {
      if (onError && callback !== onError)
        PouchORM.invokeCallback(onError, error);
    }
  }

  private static unregisterSync(
    fromDatabase: string,
    toDatabase: string,
    operation: Sync<IModel>,
  ): void {
    const operations = PouchORM.syncOperations.get(fromDatabase);
    if (operations?.get(toDatabase) !== operation) return;
    operations.delete(toDatabase);
    if (operations.size === 0) PouchORM.syncOperations.delete(fromDatabase);
  }

  static startSync<Model extends IModel = IModel>(
    fromDatabase: string,
    toDatabase: string,
    configuration: ORMSyncOptions<Model> = {},
  ): Sync<Model> {
    PouchORM.stopSync(fromDatabase, toDatabase);

    const localDatabase = PouchORM.openDatabase(fromDatabase);
    const isRemoteDatabase = /^https?:\/\//i.test(toDatabase);
    const remoteDatabase = isRemoteDatabase
      ? toDatabase
      : (PouchORM.openDatabase(toDatabase) as PouchDatabase<Model>);
    const syncOptions = {
      live: true,
      retry: true,
      ...configuration.options,
    };

    const operation = localDatabase.sync<Model>(remoteDatabase, syncOptions);
    const registeredOperation = operation as unknown as Sync<IModel>;
    const operations = PouchORM.syncOperations.get(fromDatabase) ?? new Map();
    operations.set(toDatabase, registeredOperation);
    PouchORM.syncOperations.set(fromDatabase, operations);

    operation
      .on("change", (change) => {
        PouchORM.invokeCallback(
          configuration.onChange,
          change,
          configuration.onError,
        );
      })
      .on("paused", (info) => {
        PouchORM.invokeCallback(
          configuration.onPaused,
          info,
          configuration.onError,
        );
      })
      .on("active", () => {
        PouchORM.invokeCallback(
          configuration.onActive,
          undefined,
          configuration.onError,
        );
      })
      .on("denied", (error) => {
        PouchORM.invokeCallback(
          configuration.onDenied,
          error,
          configuration.onError,
        );
      })
      .on("complete", (info) => {
        PouchORM.unregisterSync(fromDatabase, toDatabase, registeredOperation);
        PouchORM.invokeCallback(
          configuration.onComplete,
          info,
          configuration.onError,
        );
      })
      .on("error", (error) => {
        PouchORM.unregisterSync(fromDatabase, toDatabase, registeredOperation);
        PouchORM.invokeCallback(configuration.onError, error);
      });

    return operation;
  }

  static stopSync(fromDatabase: string, toDatabase?: string): number {
    const operations = PouchORM.syncOperations.get(fromDatabase);
    if (!operations) return 0;

    if (toDatabase) {
      const operation = operations.get(toDatabase);
      if (!operation) return 0;
      operation.cancel();
      PouchORM.unregisterSync(fromDatabase, toDatabase, operation);
      return 1;
    }

    const destinations = [...operations.keys()];
    destinations.forEach((destination) => {
      const operation = operations.get(destination)!;
      operation.cancel();
      PouchORM.unregisterSync(fromDatabase, destination, operation);
    });
    return destinations.length;
  }

  static async clearDatabase(databaseName: string): Promise<PouchBulkResult[]> {
    const database = PouchORM.databases.get(databaseName)?.db;
    if (!database) throw new Error(`Database does not exist: ${databaseName}`);

    const result = await database.allDocs();
    return database.bulkDocs(
      result.rows
        .filter(
          (row) =>
            !row.id.startsWith("_design/") && !row.id.startsWith("_local/"),
        )
        .map((row) => ({
          _id: row.id,
          _rev: row.value.rev,
          _deleted: true,
        })),
    );
  }

  static async deleteDatabase(databaseName: string): Promise<void> {
    const registration = PouchORM.databases.get(databaseName);
    if (!registration)
      throw new Error(`Database does not exist: ${databaseName}`);

    PouchORM.stopChangeListener(databaseName);
    PouchORM.stopSync(databaseName);

    [...PouchORM.syncOperations.keys()].forEach((source) => {
      PouchORM.stopSync(source, databaseName);
    });

    await registration.db.destroy();
    PouchORM.databases.delete(databaseName);
  }

  static getClassValidator(): ClassValidator {
    if (PouchORM.classValidator) return PouchORM.classValidator;
    throw new Error(
      "Validation is enabled, but no validator is configured. Install class-validator and pass it to PouchORM.useClassValidator, or disable validation.",
    );
  }
}
