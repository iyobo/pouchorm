import {PouchCollection, PouchModel} from '../../index';
import {IsNumber, IsString} from 'class-validator';
import {IModel} from '../../types';

export interface Person extends IModel {
    name: string;
    age: number;
    otherInfo?: { [key: string]: any };
}

export class PersonCollection extends PouchCollection<Person> {

    // Optional. Overide to define collection-specific indexes.
    async beforeInit(): Promise<void> {

        await this.addIndex(['age']); // be sure to create an index for what you plan to filter by.
    }

    // Optional. Override to perform actions after all the necessary indexes have been created.
    async afterInit(): Promise<void> {

    }
}

export interface Fight extends IModel {
    personAId: string;
    personBId?: string;
    winnerId?: string;
    loserId?: string;
}

export class FightCollection extends PouchCollection<Fight> {

}

export class Account extends PouchModel<Account> {
    @IsString()
    name: string;

    @IsNumber()
    age: number;
}

export class AccountCollection extends PouchCollection<Account> {

}