import {Person,Fight} from './TestClasses';


export function makePerson(): Person {
  return {
    name: 'Spyder',
    age: 40,
  };
}

export function makeFight(personAId: string, personBId?: string): Fight {
  return {
    personAId,
    personBId
  };
}