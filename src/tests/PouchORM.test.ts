// Person.ts
const SECONDS = 1000;
jest.setTimeout(70 * SECONDS)

import {PersonCollection} from './util/TestClasses';
import {PouchORM} from '../PouchORM';
import {makePerson} from './util/testHelpers';


describe('PouchORM', () => {
  describe('deleteDatabase', () => {
    it('works', async () => {
      const dbName = 'unit_test_volatile';
      const personCollection: PersonCollection = new PersonCollection(dbName);

      // ensures the database is created and populated
      await personCollection.upsert(makePerson());
      await personCollection.upsert(makePerson());
      const ps = await personCollection.find({});
      expect(ps.length === 2);

      // deleting
      await PouchORM.deleteDatabase(dbName);
      await expect(personCollection.find({})).rejects.toThrow('database is destroyed');

    });
  });

  describe('onSyncChange', () => {
    const db1 = 'unit_test_sync_A';
    const db2 = 'unit_test_sync_B';

    beforeEach(async () => {
      PouchORM.ensureDatabase(db1, null)
    })

    afterEach(async () => {
      await PouchORM.stopSync(db1);
    });

    afterAll(async ()=>{
      await Promise.all([PouchORM.clearDatabase(db1), PouchORM.clearDatabase(db2)]);
    })

    it('syncs between 2 databases', async () => {

      const changeLog = [];
      PouchORM.startSync(db1, db2, {
        onChange: (change) => {
          // console.log('changeDoc', change.change.docs);

          // only log collection PULL operations
          if (change.direction === 'push') return;

          change.change.docs?.forEach(it => {
            if (it.$collectionType) changeLog.push(change);
          });

        }
      });

      const a: PersonCollection = new PersonCollection(db1);
      const b: PersonCollection = new PersonCollection(db2);

      expect(changeLog.length).toBe(0);

      await b.upsert({
        name: 'Second Spyder',
        age: 40,
        lastChangedBy: 'userB'
      });
      await b.upsert({
        name: 'third Spyder',
        age: 35,
        lastChangedBy: 'userB'
      });

      // wait 1 seconds
      await new Promise((r) => setTimeout(r, 5000));
      expect(changeLog.length).toBe(2);

      // local change should not come in as a sync change
      await a.upsert({
        name: 'None Spyder',
        age: 20,
        lastChangedBy: 'userA'
      });

      // wait 1 seconds
      await new Promise((r) => setTimeout(r, 1000));
      expect(changeLog.length).toBe(2); // no change

    });
  });

});