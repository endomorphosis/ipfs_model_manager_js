import { ipfsModelManager } from "../ipfs_model_manager_js/ipfs_model_manager.js";

export default class testIpfsModelManager {
    constructor() {
    }

    async init() {
        const endpoint = "https://object.ord1.coreweave.com"
        const access_key = "CWVFBNRZEEDYTAUM"
        const secret_key = "cwoBNj1ILmRGxcm18EsWE5Qth4hVtmtNJPkLVW2AETU"
        const host_bucket = "%(bucket)s.object.ord1.coreweave.com"
        const bucket = "cloudkit-beta";
        const ipfs_src = "QmXBUkLywjKGTWNDMgxknk6FJEYu9fZaEepv3djmnEqEqD";
        const s3cfg = {
            "endpoint": endpoint,
            "accessKey": access_key,
            "secretKey": secret_key,
            "hostBucket": host_bucket,   
            "bucket": bucket
        };
        const cluster_name = "cloudkit_storage";
        //let ipfs_path = "/storage/";
        const localPath = "/storage/cloudkit-models";
        //ipfs_path = "/storage/ipfs/";
        const ten_mins = 600;
        const ten_hours = 36000;
        const ten_days = 864000;
        const never =  100000000;
        const role = "worker";
        const cache = {
            "local": "/storage/cloudkit-models/collection.json",
            "s3": "s3://cloudkit-beta/collection.json",
            "ipfs": ipfs_src,
            "https": "https://huggingface.co/endomorphosis/cloudkit-collection/resolve/main/collection.json"
        };
        const timing = {
            "local_time": ten_mins,
            "s3_time": ten_hours,
            "ipfs_time": ten_days,
            "https_time": never,
        };
        const meta = {
            // "s3cfg": s3cfg,
            "ipfs_src": ipfs_src,
            "timing": timing,
            "cache": cache,
            "role": role,
            "cluster_name": cluster_name,
            //"ipfs_path": ipfs_path,
            //"localPath": localPath,
            //"ipfs_path": ipfs_path
        };
        this.modelManager = new ipfsModelManager(null, meta);
    }

    async test(kwargs = {}) {
        await this.init();
        await this.loadCollectionCache();
        // await this.state();
        // await this.state({src: "s3"});
        await this.state({src: "local"});
        // await this.state({src: "ipfs"});
        // await this.state({src: "https"});
        await this.checkPinnedModels();
        await this.checkHistoryModels();
        await this.randHistory();
        await this.checkZombies();
        await this.checkExpired();
        await this.checkNotFound();
        // this.download_model('gte-small');
        // this.download_model('stablelm-zephyr-3b-GGUF-Q2_K');
        await this.downloadMissing();
        await this.evictExpiredModels();
        // await this.evictZombies();
        return this;
    }
}

if (require.main === module) {
    const test = new testIpfsModelManager();
    test.test().then((result) => {
        console.log("testIpfsModelManager: ", result);
    }).catch((error) => {
        console.log("testIpfsModelManager error: ", error);
    });
}