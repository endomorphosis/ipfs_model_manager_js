import { ipfsModelManager } from "../ipfs_model_manager_js/ipfs_model_manager.js";
import { requireConfig } from "../config/config.js";
import { s3Kit } from "../ipfs_model_manager_js/s3_kit.js";
import fs from "fs";
import path from "path";

export default class testIpfsModelManager {
    constructor() {
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
        this.thisDir = path.dirname(import.meta.url);
        if (this.thisDir.startsWith("file://")) {
            this.thisDir = this.thisDir.replace("file://", "");
        }
        this.parentDir = path.dirname(this.thisDir);
        if (fs.existsSync(path.join(this.parentDir, "config", "config.toml"))) {
            this.config = new requireConfig({config: path.join(this.parentDir, "config", "config.toml")});
        }
        else{
            // this.config = new requireConfig();
        }
        for (let key in this.config) {
            if (!Object.keys(meta).includes(key)) {
                meta[key] = this.config[key];
            }
        }
        this.modelManager = new ipfsModelManager(null, meta);
    }

    async test(kwargs = {}) {
        await this.modelManager.loadCollectionCache();
        // await this.state();
        // await this.state({src: "s3"});
        await this.modelManager.state({src: "local"});
        // await this.state({src: "ipfs"});
        // await this.state({src: "https"});
        await this.modelManager.checkPinnedModels();
        await this.modelManager.checkHistoryModels();
        await this.modelManager.randHistory();
        await this.modelManager.checkZombies();
        await this.modelManager.checkExpired();
        await this.modelManager.checkNotFound();
        await this.modelManager.downloadModel('gte-small');
        // this.download_model('stablelm-zephyr-3b-GGUF-Q2_K');
        await this.modelManager.downloadMissing();
        await this.modelManager.evictExpiredModels();
        // await this.evictZombies();
        return this;
    }
}

export class testS3Kit {
    constructor() {
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
        this.thisDir = path.dirname(import.meta.url);
        if (this.thisDir.startsWith("file://")) {
            this.thisDir = this.thisDir.replace("file://", "");
        }
        this.parentDir = path.dirname(this.thisDir);
        if (fs.existsSync(path.join(this.parentDir, "config", "config.toml"))) {
            this.config = new requireConfig({config: path.join(this.parentDir, "config", "config.toml")});
        }
        else{
            // this.config = new requireConfig();
        }
        for (let key in this.config) {
            if (!Object.keys(meta).includes(key)) {
                meta[key] = this.config[key];
            }
        }
        this.s3Kit = new s3Kit(s3cfg);
        this.modelManager = new ipfsModelManager(null, meta);
    }

	async test() {
		try{
			let s3LsDir = await this.s3Kit.s3LsDir('', 'swissknife-models');
            return s3LsDir;
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


}


if (import.meta.url === 'file://' + process.argv[1]) {
    const testIpfs = new testIpfsModelManager();
    const testS3 = new testS3Kit();
    try{
        await testS3.test().then((result) => {
            console.log("testS3Kit: ", result);
        }).catch((error) => {
            console.log("testS3Kit error: ", error);
            throw error;
        });

        await testIpfs.test().then((result) => {
            console.log("testIpfsModelManager: ", result);
        }).catch((error) => {
            console.log("testIpfsModelManager error: ", error);
            throw error;
        });

    }
    catch(err){
        console.log(err);
        process.exit(1);
    }   
}