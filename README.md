# pouch-orm

A solid ORM for working with PouchDB.
- Typescript is a first class citizen.
- Work with the concept of collections and pouch databases
  - Multiple collections in a single Database
  - Multiple collections in multiple Databases

## To install
`npm i pouch-collection`

or if you prefer yarn:
`yarn add pouch-collection`

## How to Use

Consider this definition of a model and it's collection.
```$xslt
    import {IModel, PouchCollection} from "pouch-collection";
    
    
    export interface IPerson extends IModel {
        name: string;
        age: number;
        otherInfo: { [key: string]: any };
    }
    
    export class Person extends PouchCollection<IPerson> {
        async init(): Promise<void> {
            await this.addIndex(['entityTemplateId']);
    
            await super.init();
        }
    
    }
    

```

The Root-store pattern is a declarative tree of classes that each know their parents, contents and children.
This is the reccomended way of using some state management libraries like MOBX.

### Serializing
Any of the field decorators you use in a class, injects that class with a special `toJSON()` function that eliminates circulars (assuming you used the proper field decorators0) which is used by 
javascript to automatically serialize any object or to stringify it you call `JSON.stringify`.

We can take our entire store tree implementation from the root and serialize it for transmission i.e turn to string. 
If you were using this with mobx and SSR, you would do this server side 
```$xslt
const str = JSON.stringify(store);
```
`str` is now the string representation of your entire store tree.

### Deserializing

Remember that `@Deserialize` decorator? Well it injected a member function into your root class called `deserialize(stringOrObject)`.
It can accept a json string or a fully json parsed javascript object. Either works!

Assuming you have passed in that `str` from the server to the client, you can do this client-side to hydrate the 
contents of the store tree to as it existed in the server.

```$xslt
store.deserialize(strFromServer);
```

And that's it!

Now your client-side store has been fully hydrated and all values will be the same as you had them in the server.


