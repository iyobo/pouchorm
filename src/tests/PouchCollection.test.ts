// Person.ts

import { Account, AccountCollection, Person, PersonCollection } from './util/TestClasses';
import { ValidationError } from 'class-validator';
import { ClassValidate } from '../types';
import { UpsertHelper } from '../helpers';
import { PouchORM } from '../PouchORM';
import { makePerson, waitFor } from './util/testHelpers';

const dbName = 'unit_test';

describe('PouchCollection Instance', () => {

  const personCollection: PersonCollection = new PersonCollection(dbName);
  const accountCollection: AccountCollection = new AccountCollection(dbName);

  afterEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
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
    it('updates documents with delta function', async () => {

      const p = makePerson();
      const person = await personCollection.upsert(p);
      expect(person.age).toBe(p.age);

      person.age = 70;
      const updatedPerson = await personCollection.upsert(person, UpsertHelper(person).merge);
      expect(updatedPerson.age).toBe(70);
    });
    it('uses custom idGenerator if defined when creating documents ', async () => {

      const p = makePerson();
      expect(p._id).toBeUndefined();

      const randomId = `p${Date.now()}`;
      personCollection.idGenerator = () => {
        return randomId;
      };
      const person: Person = await personCollection.upsert(p) as Person;


      expect(person).toBeTruthy();
      expect(person._id).toBe(randomId);

      // clean up
      personCollection.idGenerator = null;
    });

    it('calls onChangeUpserted when new', async () => {
      const a = new Account({
        name: 'Alie',
        age: 17
      });
      const internalMethodSpy = jest.spyOn(accountCollection, 'onChangeUpserted');
      const account = await accountCollection.upsert(a);

      await waitFor()
      expect(internalMethodSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        name: 'Alie',
        age: 17
      }));

    });

    it('calls onChangeUpserted when updating', async () => {
      const a = new Account({
        _id: "alie123",
        name: 'Alie',
        age: 17
      });
      const internalMethodSpy = jest.spyOn(accountCollection, 'onChangeUpserted');
      const persistedA = await accountCollection.upsert(a);
      persistedA.age++;
      await accountCollection.upsert(persistedA);

      await waitFor()
      expect(internalMethodSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        name: 'Alie',
        age: 17
      }));

      expect(internalMethodSpy).toHaveBeenNthCalledWith(2, expect.objectContaining({
        name: 'Alie',
        age: 18
      }));

    });

  });

  describe('addIndex', () => {
    beforeEach(async () => {
      await personCollection.removeIndex('testIndex');
    });

    it('can create named indexes', async () => {
      const f = await personCollection.addIndex(['name'], 'testIndex');
      expect(personCollection._indexes[3]).toBeTruthy();
      expect(personCollection._indexes[3]?.name).toBe('testIndex');
      expect(personCollection._indexes[3]?.fields?.includes('name')).toBe(true);
    });

    it('can create compound indexes with multiple fields', async () => {
      await personCollection.addIndex(['name', 'otherInfo'], 'testIndex');
      expect(personCollection._indexes[3]).toBeTruthy();
      expect(personCollection._indexes[3]?.name).toBe('testIndex');
      expect(personCollection._indexes[3]?.fields?.includes('name')).toBe(true);
      expect(personCollection._indexes[3]?.fields?.includes('otherInfo')).toBe(true);
    });

    it('adds $collectionType field to indexes', async () => {
      // Adding the $collectionType to every index of this collection for fast collection-level querying
      await personCollection.addIndex(['name'], 'testIndex');
      expect(personCollection._indexes[3]).toBeTruthy();
      expect(personCollection._indexes[3]?.fields?.length).toBe(2);
      expect(personCollection._indexes[3]?.fields?.includes('name')).toBe(true);
      expect(personCollection._indexes[3]?.fields?.includes('$collectionType')).toBe(true);
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

    it('calls onChangeUpserted for each item', async () => {

      const spy = jest.spyOn(personCollection, 'onChangeUpserted');
      const bulkPersons = await personCollection.bulkUpsert([
        {
          name: 'tifa1',
          age: 11
        },
        {
          name: 'cloud1',
          age: 22
        },
        {
          name: 'sephiroth1',
          age: 33
        },
      ]);

      await waitFor()
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'tifa1',
        age: 11
      }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'cloud1',
        age: 22
      }));
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'sephiroth1',
        age: 33
      }));

    });
  });

  describe('with data', () => {

    let bulkPersons;
    let bulkAccounts;

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
        }
      ]);
      expect(bulkPersons).toHaveLength(4);

      bulkAccounts = await accountCollection.bulkUpsert([
        new Account({
          name: 'Darmok',
          age: 202
        }),
        new Account({
          name: 'Jalad',
          age: 102
        }),
        new Account({
          name: 'Tanagra',
          age: 102
        })
      ]);
      expect(bulkAccounts).toHaveLength(3);

    });
    afterEach(async () => PouchORM.clearDatabase(dbName));

    describe('finding with', () => {
      describe('find', () => {
        it('gets all interface-based items matching non-indexed fields', async () => {

          const guys = await personCollection.find({name: 'Kingsley'});
          expect(guys).toHaveLength(1);
        });
        it('gets all interface-based items matching indexed fields', async () => {

          const guys = await personCollection.find({age: 28});
          expect(guys).toHaveLength(2);
        });
        it('gets all class-based items matching indexed fields', async () => {

          const accounts = await accountCollection.find({age: 102});
          expect(accounts).toHaveLength(2);
        });
      });

      describe('findById', () => {
        it('gets interface-based item by id', async () => {

          const tifa = await personCollection.findById(bulkPersons[0].id);
          expect(tifa).toBeTruthy();
          expect(tifa._id).toBe(bulkPersons[0].id);
          expect(tifa.name).toBe('tifa');
        });

        it('gets class-based item by id', async () => {

          const jalad = await accountCollection.findById(bulkAccounts[1].id);
          expect(jalad).toBeTruthy();
          expect(jalad._id).toBe(bulkAccounts[1].id);
          expect(jalad.name).toBe('Jalad');
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

        await personCollection.removeById(cloud._id);

        const p2 = await personCollection.find({});
        expect(p2).toHaveLength(3);

        const cloud2 = await personCollection.findById(p1[1]._id);
        expect(cloud2).toBeFalsy();

      });

      // it('calls onChangeDeleted', async () => {
      //   jest.resetAllMocks()
      //   jest.clearAllMocks()
      //
      //   const p1 = await personCollection.find({});
      //
      //   const cloud = await personCollection.findById(p1[1]._id);
      //   expect(cloud).toBeTruthy();
      //
      //   const spy = jest.spyOn(personCollection, 'onChangeDeleted');
      //   await personCollection.removeById(cloud._id);
      //
      //   await waitFor(1000)
      //   expect(spy).toHaveBeenCalledTimes(1)
      //   expect(spy).toHaveBeenCalledWith(expect.objectContaining(p1[1]))
      // })
    });
    describe('bulkRemove', () => {

      it('removes all documents in array from database', async () => {
        const guys = await personCollection.find({age: 28});
        await personCollection.bulkRemove(guys);

        const newguys = await personCollection.find({age: 28});
        expect(newguys).toHaveLength(0);
      });

    });
    describe('upsert with', () => {

      it('new instance of class Model', async () => {
        const a = new Account({
          name: 'Spyder',
          age: 32
        });
        const account = await accountCollection.upsert(a);
        expect(account.age).toBe(a.age);
      });

      it('validation of class Model properties', async () => {
        const a = new Account({
          name: 'Spyder',
          age: '32' as unknown as number
        });
        let error: ValidationError[];

        PouchORM.VALIDATE = ClassValidate.ON_AND_REJECT;

        try {
          await accountCollection.upsert(a);
        } catch (err) {
          error = err;
        }

        expect(error[0]).toBeInstanceOf(ValidationError);
      });


    });
  });

});