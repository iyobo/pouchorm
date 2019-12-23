# PouchORM

A solid ORM for working with PouchDB.
The Pouch/Couch database ecosystem is still the best choice for client-side products that needs the complex 
(and seemingly oxymoronic) feature mix of Offline-First **and** Realtime collaboration.

But the base pouchDB interface is rather bare. This ORM does a lot of the heavy lifting for you and makes it easy to get going with PouchDB so 
you can focus on your data, and not the tool.

## Highlights
- Typescript is a first class citizen.
  - Will work with raw javascript, but you'll be missing out on the cool Typescript dev perks.
- Work with the concept of collections and pouch databases
  - Multiple collections in a single Database
  - Multiple collections in multiple Databases
- Supports web, electron, react-native, and anything else pouchdb supports.

## To install
`npm i pouchorm`

or if you prefer yarn:
`yarn add pouchorm`

## How to Use

Consider this definition of a model and it's collection.
```$xslt
// Person.ts

    import {IModel, PouchCollection, PouchORM} from "pouchorm";
    PouchORM.LOGGING = true; // enable diagnostic logging if desired
    
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

`IModel` contains the meta fields needed by PouchDB and PouchORM to operate so every model interface definition 
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

## PouchCollection instance API reference
Considering that `T` is the provided type definition of your model:

- `find(criteria: Partial<T>): Promise<T[]>`
- `findOrFail(criteria: Partial<T>): Promise<T[]>`
- `findOne(criteria: Partial<T>): Promise<T>`
- `findOneOrFail(criteria: Partial<T>): Promise<T>`
- `findById(_id: string): Promise<T>`
- `findByIdOrFail(_id: string): Promise<T>`

- `removeById(id: string): Promise<void>`
- `remove(item: T): Promise<void>`

- `upsert(item: T): Promise<T>`

- `bulkUpsert(items: T[]): Promise<(Response|Error)[]>`
- `bulkRemove(items: T[]): Promise<(Response|Error)[]>`

## PouchORM metadata

PouchORM adds some metadata fields to each documents to make certain features possible.
Key of which are `$timestamp` and `$collectionType`.

### $timestamp 
This gets updated with a unix timestamp upon upserting a document.
This is also auto-indexed for time-sensitive ordering 
(i.e so items don't show up in random locations in results each time, which can be disconcerting)

### $collectionType 
There is no concept of tables or collections in PouchDB. Only databases.
This field helps us differentiate what collection each document belongs to.
This is also auto-indexed for your convenience.

## Installing PouchDB plugins

You can access the base PouchDB module used by PouchORM with `PouchORM.PouchDB`.
You can install plugins you need with that e.g `PouchORM.PouchDB.plugin(...)`.
PouchORM already comes with the plugin `pouchdb-find` which is essential for any useful querying of the database.

## Accessing the raw pouchdb database
Every instance has a reference to the internally instantiated db `collectionInstance.db` that you can use 
to reference other methods of the raw pouch db instance e.g `personCollection.db.putAttachment(...)`.

You can use this for anything that does not directly involve accessing documents e.g adding an attachment is fine.
But caution must be followed when you want to use this to manipulate a document directly, as pouch orm marks documents with 
helpful metadata it uses to enhance your development experience, particularly $timestamp and $collectionType. 
 
It is generally better to rely on the exposed functions in your collection instance.

If you want more pouchdb feature support, feel free to open an issue. This library is also very simple 
to grok, so feel free to send in a PR! 


## Supporting the Project
If you use PouchORM and it's helping you do awesome stuff, be a sport and  <a href="https://www.buymeacoffee.com/iyobo" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" ></a> or <a href="https://www.patreon.com/bePatron?u=19661939" data-patreon-widget-type="become-patron-button">Become a Patron!</a>. PRs are also welcome.
NOTE: Tests required for new PR acceptance. Those are easy to make as well.
   
# Contributors

- Iyobo Eki