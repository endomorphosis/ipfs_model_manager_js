export class storachaKitJs {
    constructor() {
    }

    async init() {
        this.test();
        console.log("storachaKitJs.init()");
        return null;
    }

    async test() {
        console.error("method not implemented");
        throw new Error("method not implemented");
    }
}

export default storachaKitJs;