import memoryAdapter from "pouchdb-adapter-memory";
import * as classValidator from "class-validator";
import { ValidationError } from "class-validator";
import { PouchCollection } from "../PouchCollection";
import { PouchORM } from "../PouchORM";
import { UpsertHelper } from "../helpers";
import { ClassValidate, CollectionSort, CollectionState } from "../types";
import {
  Account,
  AccountCollection,
  Person,
  PersonCollection,
} from "./util/TestClasses";
import { makePerson, waitFor, waitUntil } from "./util/testHelpers";

const databaseName = "pouchorm_collection_tests";
PouchORM.PouchDB.plugin(memoryAdapter);
PouchORM.adapter = "memory";
PouchORM.useClassValidator(classValidator);

describe("PouchCollection", () => {
  const people = new PersonCollection(databaseName);
  const accounts = new AccountCollection(databaseName);

  afterEach(async () => {
    people.idGenerator = undefined;
    PouchORM.VALIDATE = ClassValidate.OFF;
    PouchORM.setUser();
    await PouchORM.clearDatabase(databaseName);
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await PouchORM.deleteDatabase(databaseName);
  });

  describe("initialization", () => {
    it("waits for one initialization when operations start together", async () => {
      let releaseInitialization!: () => void;
      const gate = new Promise<void>((resolve) => {
        releaseInitialization = resolve;
      });

      class SlowPeople extends PouchCollection<Person> {
        constructor() {
          super({ database: "slow_init", collection: "slow-people" });
        }

        async beforeInit(): Promise<void> {
          await gate;
        }
      }

      const collection = new SlowPeople();
      const first = collection.find();
      await waitFor(10);
      expect(collection.state).toBe(CollectionState.LOADING);

      let secondFinished = false;
      const second = collection.find().then((result) => {
        secondFinished = true;
        return result;
      });
      await waitFor(10);
      expect(secondFinished).toBe(false);

      releaseInitialization();
      await Promise.all([first, second]);
      expect(collection.state).toBe(CollectionState.READY);
      await PouchORM.deleteDatabase("slow_init");
    });

    it("can retry after initialization fails", async () => {
      let attempts = 0;

      class FlakyPeople extends PouchCollection<Person> {
        constructor() {
          super({ database: "flaky_init", collection: "flaky-people" });
        }

        async beforeInit(): Promise<void> {
          attempts += 1;
          if (attempts === 1)
            throw new Error("Temporary initialization failure");
        }
      }

      const collection = new FlakyPeople();
      await expect(collection.find()).rejects.toThrow(
        "Temporary initialization failure",
      );
      expect(collection.state).toBe(CollectionState.NEW);
      await expect(collection.find()).resolves.toEqual([]);
      expect(collection.state).toBe(CollectionState.READY);
      await PouchORM.deleteDatabase("flaky_init");
    });
  });

  describe("collection identity", () => {
    it("uses the explicit collection name rather than the JavaScript class name", async () => {
      class DevelopmentName extends PouchCollection<Person> {
        constructor() {
          super({ database: "stable_identity", collection: "people" });
        }
      }
      class MinifiedName extends PouchCollection<Person> {
        constructor() {
          super({ database: "stable_identity", collection: "people" });
        }
      }

      const developmentBuild = new DevelopmentName();
      const productionBuild = new MinifiedName();
      const saved = await developmentBuild.upsert(makePerson());

      expect(saved.$collectionType).toBe("people");
      await expect(productionBuild.findById(saved._id!)).resolves.toMatchObject(
        {
          _id: saved._id,
          $collectionType: "people",
        },
      );
      await PouchORM.deleteDatabase("stable_identity");
    });

    it("rejects missing database and collection names", () => {
      expect(
        () =>
          new (class extends PouchCollection<Person> {})({
            database: "",
            collection: "people",
          }),
      ).toThrow("database name");
      expect(
        () =>
          new (class extends PouchCollection<Person> {})({
            database: "app",
            collection: "",
          }),
      ).toThrow("collection name");
    });
  });

  describe("queries", () => {
    it("finds every document in a collection without mutating the selector", async () => {
      await people.bulkUpsert([
        { name: "Tifa", age: 25 },
        { name: "Cloud", age: 28 },
        { name: "Barret", age: 35 },
      ]);
      await accounts.upsert(new Account({ name: "Cid", age: 32 }));

      const selector: Partial<Person> = {};
      const documents = await people.find(selector);

      expect(documents).toHaveLength(3);
      expect(selector).toEqual({});
    });

    it("supports explicit ascending and descending sort directions", async () => {
      await people.bulkUpsert([
        { name: "Tifa", age: 25 },
        { name: "Cloud", age: 28 },
        { name: "Barret", age: 35 },
      ]);

      const sort: CollectionSort<Person> = [{ age: "desc" }];
      const documents = await people.find({ age: { $gte: 0 } }, { sort });
      expect(documents.map((document) => document.age)).toEqual([35, 28, 25]);
      expect(sort).toEqual([{ age: "desc" }]);
    });

    it("rejects mixed sort directions instead of returning the wrong order", async () => {
      await expect(
        people.find({ age: { $gte: 0 } }, { sort: [{ age: "desc" }, "name"] }),
      ).rejects.toThrow("same direction");
    });

    it("returns null for missing IDs and documents from another collection", async () => {
      const account = await accounts.upsert(
        new Account({ name: "Darmok", age: 202 }),
      );

      await expect(people.findById("missing")).resolves.toBeNull();
      await expect(people.findById(account._id!)).resolves.toBeNull();
    });

    it("throws useful errors from the fail variants", async () => {
      await expect(people.findOneOrFail({ name: "Nobody" })).rejects.toThrow(
        "people matching",
      );
      await expect(people.findByIdOrFail("missing")).rejects.toThrow(
        "people with id missing does not exist",
      );
    });
  });

  describe("writes", () => {
    it("creates and updates without mutating the caller-owned object", async () => {
      const input = makePerson();
      const saved = await people.upsert(input);

      expect(input).toEqual(makePerson());
      expect(saved).toMatchObject({
        name: input.name,
        age: input.age,
        $collectionType: "people",
      });
      expect(saved._id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(saved._rev).toBeTruthy();

      const updated = await people.upsert({
        ...input,
        _id: saved._id,
        age: 41,
      });
      expect(updated.age).toBe(41);
      expect(updated._rev).not.toBe(saved._rev);
    });

    it("retries a revision conflict with the latest document", async () => {
      const saved = await people.upsert({ name: "Cloud", age: 28 });
      const originalPut = people.db.put.bind(people.db);
      let calls = 0;
      jest.spyOn(people.db, "put").mockImplementation(async (document) => {
        calls += 1;
        if (calls === 1) throw { status: 409 };
        return originalPut(document);
      });

      const updated = await people.upsert({ ...saved, age: 1 }, (existing) => ({
        ...existing,
        age: existing.age + 1,
      }));

      expect(calls).toBe(2);
      expect(updated.age).toBe(29);
    });

    it("supports asynchronous custom ID generation", async () => {
      people.idGenerator = async () => "person:custom";
      const saved = await people.upsert(makePerson());
      expect(saved._id).toBe("person:custom");
    });

    it("rejects an empty generated ID", async () => {
      people.idGenerator = () => "";
      await expect(people.upsert(makePerson())).rejects.toThrow(
        "non-empty string",
      );
    });

    it("sets the configured user on saved documents", async () => {
      PouchORM.setUser("user-123");
      const saved = await people.upsert(makePerson());
      expect(saved.$by).toBe("user-123");
    });

    it("bulk-upserts documents using the same update and validation behavior", async () => {
      const existing = await people.upsert({ name: "Tifa", age: 25 });
      const saved = await people.bulkUpsert([
        { _id: existing._id, name: "Tifa", age: 26 },
        { name: "Cloud", age: 28 },
      ]);

      expect(saved).toHaveLength(2);
      expect(saved[0]).toMatchObject({ _id: existing._id, age: 26 });
      expect(saved[0]._rev).not.toBe(existing._rev);
      expect(saved[1]._id).toBeTruthy();
    });

    it("applies repeated IDs in input order during bulk upsert", async () => {
      await people.bulkUpsert([
        { _id: "same-id", name: "First", age: 1 },
        { _id: "same-id", name: "Second", age: 2 },
      ]);

      await expect(people.findById("same-id")).resolves.toMatchObject({
        name: "Second",
        age: 2,
      });
    });

    it("does not mutate documents passed to bulk removal", async () => {
      const saved = await people.bulkUpsert([
        { name: "Tifa", age: 25 },
        { name: "Cloud", age: 28 },
      ]);

      await people.bulkRemove(saved);

      expect(saved.every((document) => document._deleted === undefined)).toBe(
        true,
      );
      await expect(people.find()).resolves.toEqual([]);
    });

    it("returns per-document conflicts when bulk removal cannot find a document", async () => {
      await expect(
        people.bulkRemove([
          {
            _id: "missing",
            _rev: "1-notreal",
            name: "Missing",
            age: 0,
          },
        ]),
      ).resolves.toEqual([
        expect.objectContaining({
          id: "missing",
          status: 409,
          name: "conflict",
        }),
      ]);
    });

    it("rejects removing a document owned by another collection", async () => {
      const account = await accounts.upsert(
        new Account({ name: "Cid", age: 32 }),
      );

      await expect(people.remove(account)).rejects.toThrow(
        `Document ${account._id} belongs to collection accounts, not people.`,
      );
      await expect(accounts.findById(account._id!)).resolves.toMatchObject({
        _id: account._id,
        name: "Cid",
      });
    });

    it("rejects a bulk removal before deleting documents from mixed collections", async () => {
      const person = await people.upsert({ name: "Cloud", age: 28 });
      const account = await accounts.upsert(
        new Account({ name: "Tifa", age: 25 }),
      );

      await expect(people.bulkRemove([person, account])).rejects.toThrow(
        `Document ${account._id} belongs to collection accounts, not people.`,
      );
      await expect(people.findById(person._id!)).resolves.toMatchObject({
        _id: person._id,
      });
      await expect(accounts.findById(account._id!)).resolves.toMatchObject({
        _id: account._id,
      });
    });

    it("routes deletions to the owning collection hook", async () => {
      const saved = await people.upsert({ name: "Aerith", age: 22 });
      const inputSnapshot = { ...saved };
      const deleted = jest.spyOn(people, "onChangeDeleted");
      const foreignDeleted = jest.spyOn(accounts, "onChangeDeleted");

      await people.remove(saved);
      await waitUntil(() => deleted.mock.calls.length === 1);

      expect(saved).toEqual(inputSnapshot);
      expect(deleted).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: saved._id,
          _deleted: true,
          $collectionType: "people",
        }),
      );
      expect(foreignDeleted).not.toHaveBeenCalled();
    });

    it("keeps deletion hooks working for removeById and bulkRemove", async () => {
      const saved = await people.bulkUpsert([
        { name: "Cloud", age: 28 },
        { name: "Barret", age: 35 },
        { name: "Tifa", age: 25 },
      ]);
      const deleted = jest.spyOn(people, "onChangeDeleted");

      await people.removeById(saved[0]._id!);
      await people.bulkRemove(saved.slice(1));
      await waitUntil(() => deleted.mock.calls.length === 3);

      expect(deleted).toHaveBeenCalledTimes(3);
    });

    it("does not delete a newer revision through a stale document", async () => {
      const saved = await people.upsert({ name: "Cloud", age: 28 });
      const updated = await people.upsert({ ...saved, age: 29 });

      await expect(people.remove(saved)).rejects.toMatchObject({ status: 409 });
      await expect(people.findById(updated._id!)).resolves.toMatchObject({
        age: 29,
        _rev: updated._rev,
      });
    });

    it("returns false when removeById cannot find the document", async () => {
      await expect(people.removeById("missing")).resolves.toBe(false);
    });
  });

  describe("validation", () => {
    it("rejects invalid models when configured to reject", async () => {
      const rejectingAccounts = new AccountCollection(
        databaseName,
        ClassValidate.ON_AND_REJECT,
      );
      const invalid = new Account({
        name: "Spyder",
        age: "32" as unknown as number,
      });

      await expect(rejectingAccounts.upsert(invalid)).rejects.toEqual(
        expect.arrayContaining([expect.any(ValidationError)]),
      );
    });

    it("allows a collection to disable globally enabled validation", async () => {
      PouchORM.VALIDATE = ClassValidate.ON_AND_REJECT;
      const unvalidatedAccounts = new AccountCollection(
        databaseName,
        ClassValidate.OFF,
      );
      const invalid = new Account({
        name: "Spyder",
        age: "32" as unknown as number,
      });

      await expect(unvalidatedAccounts.upsert(invalid)).resolves.toMatchObject({
        age: "32",
      });
    });

    it("validates every bulk-upserted model", async () => {
      const rejectingAccounts = new AccountCollection(
        databaseName,
        ClassValidate.ON_AND_REJECT,
      );

      await expect(
        rejectingAccounts.bulkUpsert([
          new Account({ name: "Valid", age: 32 }),
          new Account({ name: "Invalid", age: "wrong" as unknown as number }),
        ]),
      ).rejects.toEqual(expect.arrayContaining([expect.any(ValidationError)]));
    });

    it("preserves class validation when an update uses UpsertHelper", async () => {
      const rejectingAccounts = new AccountCollection(
        databaseName,
        ClassValidate.ON_AND_REJECT,
      );
      const saved = await rejectingAccounts.upsert(
        new Account({ name: "Valid", age: 32 }),
      );
      const invalid = new Account({
        ...saved,
        age: "wrong" as unknown as number,
      });

      await expect(
        rejectingAccounts.upsert(invalid, UpsertHelper(invalid).merge),
      ).rejects.toEqual(expect.arrayContaining([expect.any(ValidationError)]));
    });
  });

  describe("change hooks", () => {
    it("forwards rejected change hooks to onChangeError", async () => {
      class HookedPeople extends PouchCollection<Person> {
        constructor() {
          super({ database: "hook_errors", collection: "people" });
        }

        onChangeUpserted(): Promise<void> {
          throw new Error("Hook failed");
        }
      }

      const collection = new HookedPeople();
      const errorHandler = jest.spyOn(collection, "onChangeError");
      await collection.upsert(makePerson());
      await waitFor(20);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Hook failed" }),
      );
      await PouchORM.deleteDatabase("hook_errors");
    });
  });
});
