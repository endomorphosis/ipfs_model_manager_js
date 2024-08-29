export class storachaKitJs {
    constructor(resources, metadata) {
        this.resources = resources;
        this.metadata = metadata;
    }

    async init() {
        console.log("storachaKitJs.init()");
        this.test();
        return null;
    }

    async test() {
        console.error("method not implemented");
        throw new Error("method not implemented");
    }
}

export default storachaKitJs;