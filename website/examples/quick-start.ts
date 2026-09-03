import { IModel, PouchCollection, UpsertHelper } from "pouchorm";

interface Person extends IModel {
  name: string;
  age: number;
}

class People extends PouchCollection<Person> {
  constructor(database = "app-data") {
    super({ database, collection: "people" });
  }

  async beforeInit(): Promise<void> {
    await this.addIndex(["age"], "people-by-age");
  }
}

async function example(): Promise<void> {
  const people = new People();
  const ada = await people.upsert({ name: "Ada Lovelace", age: 36 });
  await people.find({ age: { $gte: 18 } }, { sort: [{ age: "desc" }] });

  const patch: Person = { _id: ada._id, name: "Ada Byron", age: 37 };
  await people.upsert(patch, UpsertHelper(patch).merge);
}

void example;
