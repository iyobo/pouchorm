import { Person } from "./TestClasses";

export function makePerson(): Person {
  return {
    name: "Spyder",
    age: 40,
  };
}

export async function waitFor(time = 1000) {
  await new Promise((r) => setTimeout(r, time));
}

export async function waitUntil(
  condition: () => boolean | Promise<boolean>,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await condition()) return;
    await waitFor(10);
  }
  throw new Error("Condition was not met before the test timeout.");
}
