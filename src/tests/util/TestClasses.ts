import { IsNumber, IsString } from 'class-validator';
import { PouchCollection } from '../../PouchCollection';
import { IModel, PouchModel } from '../../types';

// NOTE: Cannot test PouchORM.sync with memory adapter. Not supported.
// PouchORM.PouchDB.plugin(require('pouchdb-adapter-memory'));
// PouchORM.adapter = 'memory';

export interface Person extends IModel {
  name: string;
  age: number;
  otherInfo?: Record<string, unknown>;
  lastChangedBy?: string;
}

export class PersonCollection extends PouchCollection<Person> {

  // Optional. Overide to define collection-specific indexes.
  async beforeInit(): Promise<void> {

    await this.addIndex(['age']); // be sure to create an index for what you plan to filter by.
  }

  // Optional. Override to perform actions after all the necessary indexes have been created.
  async afterInit(): Promise<void> {

  }

  async onChangeUpserted(item: Person): Promise<void> {

  }

  async onChangeDeleted(item: Person): Promise<void> {

  }

  async onChangeError(item: Person): Promise<void> {

  }
}


export class Account extends PouchModel<Account> {
  @IsString()
  name: string;

  @IsNumber()
  age: number;
}

export class AccountCollection extends PouchCollection<Account> {

}
