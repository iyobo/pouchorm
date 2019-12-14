import {DateField, ParentField, Deserializer} from '../../index';

export class BadParentClass {
    cow = 'moo';
    childStore: BadLeafClass;

    constructor() {
        this.childStore = new BadLeafClass(this);
    }
}

export class BadLeafClass {
    ab = 'wonton';
    cd = 'faro';
    parent: any;

    constructor(parentNode: any) {
        this.parent = parentNode;
    }
}

// ---- good
@Deserializer
export class GoodParentClass {
    foo = 'bar';
    childStore: GoodChildClass;

    constructor() {
        this.childStore = new GoodChildClass(this);
    }

    deserialize(rawObject: string | any) {
    }
}

export class GoodChildClass {
    ab = 'wonton';
    @DateField myDate = new Date(1000000);
    @ParentField parent: GoodParentClass;

    child: NestedLeafClass;

    constructor(parentNode: GoodParentClass) {
        this.parent = parentNode;
        this.child = new NestedLeafClass(this);
    }
}

export class NestedLeafClass {
    mn = 'Fiery';
    op = 'jutsu';
    @ParentField parent: GoodChildClass;

    constructor(parentNode: GoodChildClass) {
        this.parent = parentNode;
    }
}

@Deserializer
export class SoloClass {
    spider = 'man';
    wonder = 'woman';

    justiceLeague = {
        superMan: true,
        spiderMan: false
    };

    deserialize(raw) {}
}
