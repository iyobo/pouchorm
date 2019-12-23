# pouch-orm

A solid ORM for working with PouchDB.
- Typescript is a first class citizen.
  - Will work with raw javascript, but you'll be missing out on the cool Typescript dev perks.
- Work with the concept of collections and pouch databases
  - Multiple collections in a single Database
  - Multiple collections in multiple Databases
- Supports web,  electron, react-native, and anything else pouchdb supports.

## To install
`npm i pouch-collection`

or if you prefer yarn:
`yarn add pouch-collection`

## How to Use

Consider this definition of a model and it's collection.
```$xslt
// Person.ts

    import {IModel, PouchCollection} from "pouch-collection";
    
    export interface IPerson extends IModel {
        name: string;
        age: number;
        otherInfo: { [key: string]: any };
    }
    
    export class PersonCollection extends PouchCollection<IPerson> {
        
        // Optional. Overide to define collection-specific indexes.
        async beforeInit(): Promise<void> {
            
            await this.addIndex(['age']); // be sure to create an index for what you plan to filter by.
        }

        // Optional. Overide to perform actions after all the necessary indexes have been created.
        async afterInit(): Promise<void> {
           
        }
    
    }
    
```

`IModel` contains the meta fields needed by pouchdb and pouch-collections to operate so every model interface definition 
needs to extend it. Only supports the same field types as pouchDB does.

`PouchCollection` is a generic abstract class that should be given your model type. 
This helps it guide you later and give you suggestions of how to work with your model.

If you need to do things before and after initialization, you can override the async hook functions: `beforeInit` 
or `afterInit`;

Now that we have defined our **Model** and a **Collection** for that model, Here is how we instantiate collections.
You should probably define and export collection instances somewhere in your codebase that you can easily import 
anywhere in your app.
       
```$xslt

    // instantiate a collection by giving it the dbname it should use
    export const personCollection: PersonCollection = new Person('db1');

    // Another collection. Notice how it shares the same dbname we passed into the previous collection instance.
    export const someOtherCollection: SomeOtherCollection = new SomeOtherCollection('db1'); 
    
    // In case we needed the same model but for a different database
    export const personCollection: PersonCollection = new Person('db2');

```

From this point:
 - We have our definitions
 - We have our collection instances
 
We are ready to start CRUDing!

```$xslt
    import {personCollection} from '...'

    // Using collections
    let somePerson: IPerson = {
        name: 'Basket Mouth',
        age: 99,
    }
    let anotherPerson: IPerson = {
        name: 'Bovi',
        age: 45,
    }

    somePerson = await personCollection.upsert(somePerson);
    anotherPerson = await personCollection.upsert(anotherPerson);
    
    // somePerson has been persisted and will now also have some metafields like _id, _rev, etc.

    somePerson.age = 45;
    somePerson = await personCollection.upsert(somePerson);

    // changes to somePerson has been persisted. _rev would have also changed.

    const result: IPerson[] = await personCollection.find({age: 45})
    
    // result.length === 2

```

## Collection API reference
Considering that `T` is the provided type definition of your model:

- `find(criteria: Partial<T>): Promise<T[]>`
    

- `findOrFail(criteria: Partial<T>): Promise<T[]>`


- `findOne(criteria: Partial<T>): Promise<T>`


- `findOneOrFail(criteria: Partial<T>): Promise<T>`


- `findById(_id: string): Promise<T>`


- `findByIdOrFail(_id: string): Promise<T>`



- `removeById(id: string): Promise<void>`


- `upsert(item: T): Promise<T>`

- `bulkUpsert(items: T[]): Promise<T>`

- `bulkRemove(items: T[]): Promise<T>`

You also have access to a collection instance's internal pouchdb reference e.g `collectionInstance.db.find`, 
but that should NEVER be used to manipulate data. 
For data manipulation, it is best to rely on the exposed functions provided by the collection instance because of the way pouch-collections wraps the pouch data.

If you want more pouchdb feature support, feel free to open an issue. This library is also very simple 
to grok, so feel free to send in a PR! 

NOTE: Tests required for new PR acceptance. Those are easy to make as well.
   