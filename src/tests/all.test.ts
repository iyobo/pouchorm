import {BadParentClass, GoodParentClass, SoloClass} from './util/TestClasses';

describe('Without uncircled', () => {
    it('when serializing, throws Circular structure error if not inheriting ParentClassNode', () => {
        try {
            const parent = new BadParentClass();
            const serializedClass = JSON.stringify(parent);

            fail('The last line should have thrown an error');
        } catch (err) {
            // This will either be a circular reference error or a maximum call stack error
        }
    });
});

describe('With Uncircle', () => {
    it('serializes', () => {

        const parent = new GoodParentClass();
        const serializedClass = JSON.stringify(parent).replace(/\\/g, '');

        expect(serializedClass).toEqual('{"foo":"bar","childStore":{"ab":"wonton","myDate":"1970-01-01T00:16:40.000Z","child":{"mn":"Fiery","op":"jutsu"}}}');
    });

    it('deserializes JSON object', () => {
        const parent: GoodParentClass = new GoodParentClass();

        parent.deserialize({foo: 'wopo'});

        expect(parent.foo).toBe('wopo');
    });
    it('deserializes JSON String', () => {
        const parent: GoodParentClass = new GoodParentClass();

        parent.deserialize(`{"foo":"wopo"}`);

        expect(parent.foo).toBe('wopo');
    });
    it('deserializes JSON nested Object', () => {
        const parent: GoodParentClass = new GoodParentClass();

        parent.deserialize({
            foo: 'wopo',
            childStore: {
                ab: 'why'
            }
        });

        expect(parent.foo).toBe('wopo');
        expect(parent.childStore.ab).toBe('why');
    });
    it('deserializes JSON nested string', () => {
        const parent: GoodParentClass = new GoodParentClass();

        parent.deserialize(`{
            "foo": "wopo",
            "childStore": {
                "ab": "why"
            }
        }`);

        expect(parent.foo).toBe('wopo');
        expect(parent.childStore.ab).toBe('why');
    });
    it('can deserialize serialize output', () => {
        const parent: GoodParentClass = new GoodParentClass();
        parent.foo = 'super';
        parent.childStore.ab = 'duper';
        const serializedTree = JSON.stringify(parent);

        parent.deserialize(serializedTree);

        expect(parent.foo).toBe('super');
        expect(parent.childStore.ab).toBe('duper');
    });

    it('can deserialize serialize output for solo class', () => {
        const solo: SoloClass = new SoloClass();
        solo.spider = 'girl';
        solo.justiceLeague.spiderMan = true;
        const serializedTree = JSON.stringify(solo);

        const newSolo = new SoloClass();
        expect(newSolo.spider).toBe('man');

        newSolo.deserialize(serializedTree);

        expect(newSolo.spider).toBe('girl');
        expect(newSolo.justiceLeague.spiderMan).toBe(true);
    });
});

