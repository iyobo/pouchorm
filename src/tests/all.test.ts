// Person.ts

import {PouchCollection} from '../index';

PouchCollection.LOGGING = false;
import {Fight, FightCollection, Person, PersonCollection} from './util/TestClasses';


function makePerson(): Person {
    return {
        name: 'Spyder',
        age: 40,
    };
}

function makeFight(personAId: string, personBId?: string): Fight {
    return {
        personAId,
        personBId
    };
}

describe('PouchCollection Instance', () => {


    let personCollection: PersonCollection = new PersonCollection('unit_test');
    let fightCollection: FightCollection = new FightCollection('unit_test');

    beforeEach(async () => {
        await PersonCollection.clearDatabase('unit_test');
    });

    describe('upsert', () => {
        it('creates new documents if does not exist', async () => {

            const p = makePerson();
            expect(p._id).toBeUndefined();
            expect(p._rev).toBeUndefined();

            const person: Person = await personCollection.upsert(p) as Person;

            expect(person).toBeTruthy();
            expect(person.name).toBe(makePerson().name);
            expect(person._id).toBeTruthy();
            expect(person._rev).toBeTruthy();
            expect(person.$collectionType).toBeTruthy();
            expect(person.$timestamp).toBeTruthy();
        });
        it('updates documents if exist', async () => {

            const p = makePerson();
            const person = await personCollection.upsert(p);
            expect(person.age).toBe(p.age);

            person.age = 501;
            const updatedPerson = await personCollection.upsert(person);
            expect(updatedPerson.age).toBe(501);
        });
    });
    describe('bulkUpsert', () => {
        it('creates documents in array', async () => {

            const bulkPersons = await personCollection.bulkUpsert([
                {
                    name: 'tifa',
                    age: 25
                },
                {
                    name: 'cloud',
                    age: 28
                },
                {
                    name: 'sephiroth',
                    age: 999
                },
            ]);

            expect(bulkPersons).toHaveLength(3);
            expect(bulkPersons[0].id).toBeTruthy();
            expect(bulkPersons[1].id).toBeTruthy();
            expect(bulkPersons[2].id).toBeTruthy();
        });
        it('updates documents in an array', async () => {

            const p = makePerson();
            const person = await personCollection.upsert(p);
            expect(person._id).toBeTruthy();

            person.age = 57;
            const bulkPersons = await personCollection.bulkUpsert([
                {
                    name: 'tifa',
                    age: 25
                },
                {
                    name: 'cloud',
                    age: 28
                },
                {
                    name: 'sephiroth',
                    age: 999
                },
                person
            ]);

            expect(bulkPersons).toHaveLength(4);
            expect(bulkPersons[0].id).toBeTruthy();
            expect(bulkPersons[1].id).toBeTruthy();
            expect(bulkPersons[2].id).toBeTruthy();
            expect(bulkPersons[3].id).toBeTruthy();
            expect(bulkPersons[3].id).toBe(person._id);
        });
    });

    describe('with data', () => {

        let bulkPersons;
        beforeEach(async () => {

            bulkPersons = await personCollection.bulkUpsert([
                {
                    name: 'tifa',
                    age: 25
                },
                {
                    name: 'cloud',
                    age: 28
                },
                {
                    name: 'Kingsley',
                    age: 28
                },
                {
                    name: 'sephiroth',
                    age: 999
                },
            ]);
            expect(bulkPersons).toHaveLength(4);

        });

        describe('finding with', () => {
            describe('find', () => {
                it('gets all items matching indexed fields', async () => {

                    const guys = await personCollection.find({age: 28});
                    expect(guys).toHaveLength(2);
                });
                it('gets all items matching non-indexed fields', async () => {

                    const guys = await personCollection.find({name: 'Kingsley'});
                    expect(guys).toHaveLength(1);
                });
            });

            describe('findById', () => {
                it('gets item by id', async () => {

                    const tifa = await personCollection.findById(bulkPersons[0].id);
                    expect(tifa).toBeTruthy();
                    expect(tifa._id).toBe(bulkPersons[0].id);
                    expect(tifa.name).toBe('tifa');
                });

                it('returns null if item does not exist', async () => {

                    const nada = await personCollection.findById('zilch');
                    expect(nada).toBeFalsy();
                });
            });
        });
        describe('removeById', () => {

            it('removes by id', async () => {

                const p1 = await personCollection.find({});
                expect(p1).toHaveLength(4);

                const cloud = await personCollection.findById(p1[1]._id);
                expect(cloud).toBeTruthy();

                await personCollection.removeById(cloud._id)

                const p2 = await personCollection.find({});
                expect(p2).toHaveLength(3);

                const cloud2 = await personCollection.findById(p1[1]._id);
                expect(cloud2).toBeFalsy();

            });

        })
    });

});