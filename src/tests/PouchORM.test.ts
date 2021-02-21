// Person.ts

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

});