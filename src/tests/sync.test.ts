// Person.ts

import {PersonCollection} from './util/TestClasses';
import {PouchORM} from '../PouchORM';
import {makePerson} from './util/testHelpers';

import {ChildProcessWithoutNullStreams, spawn} from 'child_process';


describe('Sync', () => {
  let couchdb: ChildProcessWithoutNullStreams;

  beforeAll(() => {
    couchdb = spawn('yarn',['server:start']);
  });

  afterAll(() => {
    couchdb.;
  });

  describe('onSyncChange', () => {
    it('works', async () => {

      const a: PersonCollection = new PersonCollection('unit_test_sync_A');
      const b: PersonCollection = new PersonCollection('unit_test_sync_B');

      await a.upsert({
        name: 'Spyder',
        age: 20,
      });

      a.onSyncChange = async (change) => {
        console.log('a', change);
      };
      b.onSyncChange = async (change) => {
        console.log('b', change);
      };

      await a.upsert({
        name: 'Second Spyder',
        age: 40,
      });


    });
  });

});