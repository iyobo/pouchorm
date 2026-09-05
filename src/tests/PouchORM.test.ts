import PouchDB from "pouchdb";
import memoryAdapter from "pouchdb-adapter-memory";
import { PouchORM } from "../PouchORM";
import { PersonCollection } from "./util/TestClasses";
import { waitUntil } from "./util/testHelpers";

PouchORM.PouchDB.plugin(memoryAdapter);
PouchORM.adapter = "memory";

describe("PouchORM", () => {
  it("uses the same PouchDB constructor exported by the peer dependency", () => {
    expect(PouchORM.PouchDB).toBe(PouchDB);
  });

  it("does not replace the PouchDB constructor after a database is open", async () => {
    const database = "constructor_guard";
    PouchORM.openDatabase(database);
    expect(() => PouchORM.usePouchDB(PouchDB)).toThrow(
      "before opening a database",
    );
    await PouchORM.deleteDatabase(database);
  });

  it("deletes a database after its change listener has stopped", async () => {
    const database = "delete_stopped_listener";
    const people = new PersonCollection(database);
    await people.upsert({ name: "Tifa", age: 25 });

    expect(PouchORM.stopChangeListener(database)).toBe(true);
    expect(PouchORM.stopChangeListener(database)).toBe(false);
    await PouchORM.deleteDatabase(database);
    await expect(people.find()).rejects.toThrow();
  });

  it("preserves collection indexes when clearing application documents", async () => {
    const database = "clear_preserves_indexes";
    const people = new PersonCollection(database);
    await people.bulkUpsert([
      { name: "Cloud", age: 28 },
      { name: "Tifa", age: 25 },
    ]);

    await PouchORM.clearDatabase(database);
    await people.bulkUpsert([
      { name: "Barret", age: 35 },
      { name: "Aerith", age: 22 },
    ]);

    const sorted = await people.find(
      { age: { $gte: 0 } },
      { sort: [{ age: "desc" }] },
    );
    expect(sorted.map((person) => person.age)).toEqual([35, 22]);
    await PouchORM.deleteDatabase(database);
  });

  it("handles database names that overlap JavaScript object properties", async () => {
    const people = new PersonCollection("__proto__");
    const saved = await people.upsert({ name: "Prototype", age: 1 });
    await expect(people.findById(saved._id!)).resolves.toMatchObject({
      name: "Prototype",
    });
    await PouchORM.deleteDatabase("__proto__");
  });

  it("returns the sync operation and removes it when stopped", async () => {
    const source = "sync_lifecycle_source";
    const destination = "sync_lifecycle_destination";
    new PersonCollection(source);
    new PersonCollection(destination);

    const operation = PouchORM.startSync(source, destination);
    expect(PouchORM.getActiveSync(source, destination)).toBe(operation);
    expect(PouchORM.stopSync(source, destination)).toBe(1);
    expect(PouchORM.getActiveSync(source, destination)).toBeUndefined();
    expect(PouchORM.stopSync(source, destination)).toBe(0);

    await Promise.all([
      PouchORM.deleteDatabase(source),
      PouchORM.deleteDatabase(destination),
    ]);
  });

  it("replaces an existing sync for the same database pair", async () => {
    const source = "sync_replace_source";
    const destination = "sync_replace_destination";
    new PersonCollection(source);
    new PersonCollection(destination);

    const first = PouchORM.startSync(source, destination);
    const cancel = jest.spyOn(first, "cancel");
    const second = PouchORM.startSync(source, destination);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(PouchORM.getActiveSync(source, destination)).toBe(second);

    PouchORM.stopSync(source);
    await Promise.all([
      PouchORM.deleteDatabase(source),
      PouchORM.deleteDatabase(destination),
    ]);
  });

  it("moves changes in both directions", async () => {
    const source = "sync_changes_source";
    const destination = "sync_changes_destination";
    const sourcePeople = new PersonCollection(source);
    const changes: string[] = [];

    PouchORM.startSync(source, destination, {
      onChange: (change) => {
        changes.push(change.direction);
      },
    });
    const destinationPeople = new PersonCollection(destination);

    await destinationPeople.upsert({ name: "Cloud", age: 28 });
    await waitUntil(
      async () => (await sourcePeople.find({ name: "Cloud" })).length === 1,
    );

    await sourcePeople.upsert({ name: "Tifa", age: 25 });
    await waitUntil(
      async () => (await destinationPeople.find({ name: "Tifa" })).length === 1,
    );

    expect(changes).toEqual(expect.arrayContaining(["pull", "push"]));

    PouchORM.stopSync(source);
    await Promise.all([
      PouchORM.deleteDatabase(source),
      PouchORM.deleteDatabase(destination),
    ]);
  });

  it("forwards rejected sync callbacks to onError", async () => {
    const source = "sync_callback_source";
    const destination = "sync_callback_destination";
    const sourcePeople = new PersonCollection(source);
    const destinationPeople = new PersonCollection(destination);
    const onError = jest.fn();

    PouchORM.startSync(source, destination, {
      onChange: async () => {
        throw new Error("Callback failed");
      },
      onError,
    });
    await destinationPeople.upsert({ name: "Barret", age: 35 });
    await waitUntil(
      async () => (await sourcePeople.find({ name: "Barret" })).length === 1,
    );
    await waitUntil(() => onError.mock.calls.length > 0);

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Callback failed" }),
    );

    PouchORM.stopSync(source);
    await Promise.all([
      PouchORM.deleteDatabase(source),
      PouchORM.deleteDatabase(destination),
    ]);
  });

  it("cancels incoming synchronization before deleting a destination database", async () => {
    const source = "sync_delete_source";
    const destination = "sync_delete_destination";
    new PersonCollection(source);
    new PersonCollection(destination);

    PouchORM.startSync(source, destination);
    await PouchORM.deleteDatabase(destination);

    expect(PouchORM.getActiveSync(source, destination)).toBeUndefined();
    await PouchORM.deleteDatabase(source);
  });
});
