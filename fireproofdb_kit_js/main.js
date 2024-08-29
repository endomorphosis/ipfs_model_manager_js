export class FireproofKitJs {
    constructor(resources, metadata) {
        this.resources = resources;
        this.metadata = metadata;
    }

    async init() {
        console.log("FireproofKit.init()");
        this.test();
        return null;
    }

    async test() {
        console.error("method not implemented");
        throw new Error("method not implemented");
    }
}

export default FireproofKitJs;