import { PersonCollection } from '../tests/util/TestClasses'

async function main() {
  const personCollection = new PersonCollection('sandbox_temp')

  const person = await personCollection.upsert({name: 'Mofe', age: 34})
  const person2 = await personCollection.upsert({name: 'Amy', age: 25})

  // await personCollection.remove(person)

  console.log('findOne', await personCollection.findOne({_id: person._id}))
  console.log('find', await personCollection.find())
}

main()