import { IsNumber, IsString } from "class-validator";
import { PouchCollection } from "../../PouchCollection";
import { ClassValidate, IModel, PouchModel } from "../../types";

export interface Person extends IModel {
  name: string;
  age: number;
  otherInfo?: Record<string, unknown>;
  lastChangedBy?: string;
}

export class PersonCollection extends PouchCollection<Person> {
  constructor(database: string, validate = ClassValidate.INHERIT) {
    super({ database, collection: "people", validate });
  }

  async beforeInit(): Promise<void> {
    await this.addIndex(["age"]);
  }

  async afterInit(): Promise<void> {}

  async onChangeUpserted(_item: Person): Promise<void> {}

  async onChangeDeleted(_item: Person): Promise<void> {}

  async onChangeError(_error: Error): Promise<void> {}
}

export class Account extends PouchModel<Account> {
  @IsString()
  name!: string;

  @IsNumber()
  age!: number;
}

export class AccountCollection extends PouchCollection<Account> {
  constructor(database: string, validate = ClassValidate.INHERIT) {
    super({ database, collection: "accounts", validate });
  }

  async onChangeUpserted(_item: Account): Promise<void> {}
}
