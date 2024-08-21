import { rawListeners } from "npm";
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

export class testS3Kit {
    constructor() {
    
    }

	async test() {
		try{
			let s3LsDir = await this.s3LsDir('', 'swissknife-models');
		}
		catch(err){
			console.log(err);
		}
	}

	async test1() {
		const endpoint = "https://object.ord1.coreweave.com";
		const accessKey = "OVEXCZJJQPUGXZOV";
		const secretKey = "H1osbJRy3903PTMqyOAGD6MIohi4wLXGscnvMEduh10";
		const bucket = "swissknife-models";
		const dir = "bge-base-en-v1.5@hf";
		const config = {
			accessKey: accessKey,
			secretKey: secretKey,
			endpoint: endpoint,
		};
		this.s3cfgToBoto(config);
		const s3 = this.getSession(config);
		const params = {
			Bucket: bucket,
			Prefix: dir
		};
		const data = await s3.listObjectsV2(params).promise();
		const directory = {};
		data.Contents.forEach((obj) => {
			directory[obj.Key] = {
				key: obj.Key,
				last_modified: obj.LastModified,
				size: obj.Size,
				e_tag: obj.ETag,
			};
		});
		return directory;
	}


	async test2() {
		const endpoint = "https://object.ord1.coreweave.com";
		const accessKey = "OVEXCZJJQPUGXZOV";
		const secretKey = "H1osbJRy3903PTMqyOAGD6MIohi4wLXGscnvMEduh10";
		const bucket = "cloudkit-beta";
		const keys = [
			'stablelm-zephyr-3b-GGUF-Q2_K@gguf/manifest.json',
			'stablelm-zephyr-3b-GGUF-Q2_K-Q2_K@gguf/README.md',
			'stablelm-zephyr-3b-GGUF-Q2_K-Q2_K@gguf/config.json',
			'stablelm-zephyr-3b-GGUF-Q2_K-Q2_K@gguf/manifest.json',
			'stablelm-zephyr-3b-GGUF-Q2_K-Q2_K@gguf/stablelm-zephyr-3b.Q2_K.gguf'
		];
		const config = {
			accessKeyId: accessKey,
			secretAccessKey: secretKey,
			endpoint: endpoint,
		};
		const s3 = new AWS.S3(config);
		const results = [];
		for (const key of keys) {
			const params = {
				Bucket: bucket,
				Key: key
			};
			const data = await s3.getObject(params).promise();
			results.push(data);
		}
		return results;
	}

	async test3() {
		const endpoint = "https://object.ord1.coreweave.com";
		const accessKey = "OVEXCZJJQPUGXZOV";
		const secretKey = "H1osbJRy3903PTMqyOAGD6MIohi4wLXGscnvMEduh10";
		const bucket = "cloudkit-beta";
		const key = 'Airoboros-c34B-3.1.2-GGUF-Q4_0-Q4_0@gguf/README.md';
		const config = {
			accessKeyId: accessKey,
			secretAccessKey: secretKey,
			endpoint: endpoint,
		};
		const s3 = new AWS.S3(config);
		const params = {
			Bucket: bucket,
			Key: key
		};
		const data = await s3.getObject(params).promise();
		return data;
	}


    async init() {
    
    }
}

if (require.main === module) {
    const testIpfs = new testIpfsModelManager();
    const testS3 = new testS3Kit();
    try{
        await testIpfs.test().then((result) => {
            console.log("testIpfsModelManager: ", result);
        }).catch((error) => {
            console.log("testIpfsModelManager error: ", error);
            raise(error);
        });
        await testS3.test().then((result) => {
            console.log("testS3Kit: ", result);
        }).catch((error) => {
            console.log("testS3Kit error: ", error);
            raise(error);
        });
    }
    catch(err){
        console.log(err);
        process.exit(1);
    }   
}