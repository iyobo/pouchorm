function toJSON() {
    const obj = {};
    const keys = Object.keys(this);

    for (const key of keys) {
        const ignoreCodex = this._$$uncircleIgnoredFields || {};
        if (!ignoreCodex[key]) {
            obj[key] = this[key];
        }
    }

    // let str = JSON.stringify(obj);
    // str = str.replace(/\\/g, '');
    return obj;
}

const fill= (target, rawObject: string | any)=> {

    const keys = Object.keys(rawObject);
    // console.log('rawObject', rawObject);

    for (const key of keys) {
        const dateFields = target['_$$uncircleDateFields'] || {};
        const field = rawObject[key];

        if (field !== null && field !== undefined) {
            // console.log(' key:', key,
            //     'field:', field,
            //     'self:', target[key],
            //     'typeof self:', typeof target[key],
            //     'typeof field:', typeof field);

            if (dateFields[key]) {
                // console.log('  date', field);
                target[key] = new Date(field);
                // } else if (typeof field == 'object' && field.constructor && field.constructor.name !== 'Object') { // raw object, not a class instance
            } else if (typeof field == 'object' || !field.constructor ) { // raw object, not a class instance
                if(Object.keys(field).length=== 0) {
                    // this is empty. ignore
                    // console.log('  empty field object. ignoring');
                    continue;
                }

                // console.log('  nesting', key, field);
                if(!target[key]) target[key] = {};
                fill(target[key], field);
            } else {
                // console.log('  Nothing special. probably a primitive', field);
                target[key] = field;
            }
        }
    }
};

function deserialize(rawObject: string | any) {
    let raw = rawObject;
    if (typeof rawObject === 'string') {
        raw = JSON.parse(rawObject);
    }
    fill(this, raw);
}


// @ParentField
/*
Marks a class field as a reference to a parent object.
To prevent circles, we ensure this field does not get serialized.
*/
export function ParentField(target: any, propertyName: string) {
    const classDef = target.constructor;
    classDef.prototype._$$uncircleIgnoredFields = classDef.prototype._$$uncircleIgnoredFields || {'_$$uncircleIgnoredFields': 1};
    classDef.prototype._$$uncircleIgnoredFields[propertyName] = 1;

    // overwrite toJSON
    classDef.prototype.toJSON = toJSON;
}

export function DateField(target: any, propertyName: string) {
    const classDef = target.constructor;
    classDef.prototype._$$uncircleDateFields = classDef.prototype._$$uncircleDateFields || {};
    classDef.prototype._$$uncircleDateFields[propertyName] = 1;

    // overwrite toJSON
    classDef.prototype.toJSON = toJSON;
}

export function Deserializer(classDef: Function) {

    // add deserialize function to prototype
    classDef.prototype.deserialize = deserialize;
}

