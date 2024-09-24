import { Person } from './TestClasses';


export function makePerson(): Person {
  return {
    name: 'Spyder',
    age: 40,
  };
}

export async function waitFor(time = 1000) {
  await new Promise((r) => setTimeout(r, time));
}