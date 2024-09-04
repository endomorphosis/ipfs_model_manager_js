import { libp2pKitJs } from 'libp2p_kit_js'
import { ipfsKitJs } from 'ipfs_kit_js';
import { orbitDbKitJs } from 'orbitdb_kit_js';
// import { ipfsFaissJs } from 'ipfs_faiss_js'
// import { storachaKitJs } from '../storacha_kit_js/main.js';
// import { fireproofDbKitJs } from '../fireproofdb_kit_js/main.js';
import { ipfsModelManagerJs } from 'ipfs_model_manager_js';
import { requireConfig } from "../config/config.js";
import fs from "fs";
import path from "path";
import os from "os";
import { exec, execSync } from "child_process";
import { t } from "tar";

export class testIpfsModelManager {
    constructor(resources = {}, metadata = {}) {
        this.ipfsModelManager = new ipfsModelManagerJs(resources, metadata)
        this.orbitDbKit = new orbitDbKitJs(resources, metadata)
        this.libp2pKit = new libp2pKitJs(resources, metadata)
        this.ipfsKit = new ipfsKitJs(resources, metadata)
        // this.storachaKit = new storachaKitJs(resources, metadata)
        // this.fireproofDbKit = new fireproofDbKitJs(resources, metadata)
        // this.ipfsFaiss = new ipfsFaissJs(resources, metadata)

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
    }


    async init() {
        let init_results = {};
        let test_libp2p_kit = {};
        let test_orbit_db_kit = {};
        let test_ipfs_faiss = {};
        let test_ipfs_kit = {};
        let test_storacha_kit = {};
        let test_fireproof_db_kit = {};
        let test_ipfs_model_manager  = {};

        try{
            console.log("libp2p_kit init");
            // test_libp2p_kit = await this.libp2pKit.init()
        }
        catch(err){
            console.log(err);
            test_libp2p_kit = err;
        }

        try {
            console.log("ipfs_kit init");
            // test_ipfs_kit = await this.ipfsKit.init()
        }
        catch(err){
            console.log(err);
            test_ipfs_kit = err;
        }

        try{
            console.log("orbit_db_kit init");
            //test_orbit_db_kit = await this.orbitDbKit.init(this.libp2pKit,this.ipfsKit)
        }
        catch(err){
            console.log(err);
            test_orbit_db_kit = err;
        }

        try{
            console.log("ipfs_faiss init");
            // test_ipfs_faiss = await this.ipfsFaiss.init()
        }
        catch(err){
            console.log(err);
            test_ipfs_faiss = err
        }

        try{
            console.log("storacha_kit init");
            // test_storacha_kit = await this.storachaKit.init()
        }
        catch(err){
            console.log(err);
            test_storacha_kit = err
        }

        try{
            console.log("fireproof_db_kit init");
            // test_fireproof_db_kit = await this.fireproofDbKit.init()
        }
        catch(err){
            console.log(err);
            test_fireproof_db_kit = err
        }

        try{
            console.log("ipfs_model_manager init");
            // test_ipfs_model_manager = await this.ipfsModelManager.init(this.libp2pKit, this.ipfsKit, this.orbitDbKit, this.storachaKit, this.fireproofDbKit, this.ipfsFaiss)
        }
        catch(err){
            console.log(err);
            test_ipfs_model_manager = err
        }

        const results = {
            test_libp2p_kit: test_libp2p_kit,
            test_orbit_db_kit: test_orbit_db_kit,
            test_ipfs_faiss: test_ipfs_faiss,
            test_ipfs_kit: test_ipfs_kit,
            test_storacha_kit: test_storacha_kit,
            test_fireproof_db_kit: test_fireproof_db_kit,
            test_ipfs_model_manager: test_ipfs_model_manager
        }

        return results;
    }

    async test(kwargs = {}) {

        await this.libp2pKit.test()
        await this.ipfsKit.test()
        await this.orbitDbKit.test()
        await this.ipfsFaiss.test()
        await this.storachaKit.test()
        await this.fireproofDbKit.test()
        await this.ipfsModelManager.test(kwargs)
    }

    async test_state() {
        let test_state = {};
        try {
            test_state.state = await this.ipfsModelManager.state()
        }
        catch(err){
            console.log(err);
            test_state.state = err;
            try{
                test_state.local =  await this.ipfsModelManager.state({src: "local"});
            }
            catch(err){
                console.log(err);
                test_state.local = err;
            }
            try{
                test_state.s3Kit =  await this.ipfsModelManager.state({src: "s3"});
            }
            catch(err){
                console.log(err);
                test_state.s3Kit = err;
            }
            try{
                test_state.ipfs =  await this.ipfsModelManager.state({src: "ipfs"});
            }   
            catch(err){
                console.log(err);
                test_state.ipfs = err;
            }
            try{
                test_state.https =  await this.ipfsModelManager.state({src: "https"});
            }
            catch(err){
                console.log(err);
                test_state.https = err;
            }
            try{
                test_state.orbitDbKit =  await this.orbitDbKit.state({src: "orbitdb"});
            }
            catch(err){
                console.log(err);
                test_state.orbitDbKit = err;
            }
        }
        return test_state;
    }


    async test_asserts() {
        let asserts = {};

        try {
            asserts.randHistory = await this.modelManager.randHistory();
        }
        catch(err){
            console.log(err);
            asserts.randHistory = err;
        }

        try{      
            asserts.downloadModel = await this.modelManager.downloadModel('gte-small');
        }
        catch(err){
            console.log(err);
            asserts.downloadModel = err;
        }
        try{
            asserts.rmModel = await this.modelManager.rmModel('gte-small');
        }
        catch(err){
            console.log(err);
            asserts.rmModel = err;
        }

        try{
            asserts.evictExpiredModels = await this.modelManager.evictExpiredModels();
        }
        catch(err){
            console.log(err);
            asserts.evictExpiredModels = err;
        }

        try{
            asserts.evictZombies = await this.modelManager.evictZombies();
        }
        catch(err){
            console.log(err);
            asserts.evictZombies = err;
        }

        try{
            asserts.downloadMissing = await this.modelManager.downloadMissing();
        }
        catch(err){
            console.log(err);
            asserts.downloadMissing = err;
        }

        return asserts;

    }

    async test() {
        let test_results = {};
        try{
            test_results.state = {};
            // test_results.state = await this.state();
        }
        catch(err){
            console.log(err);
            test_results.state = err;
        }

        try{
            test_results.collectionCache = {};
            // test_results.collectionCache = await this.ipfsModelManager.loadCollectionCache();
        }
        catch(err){
            console.log(err);
            test_results.collectionCache = err;
        }

        try{
            test_results.collection = {};
            // test_results.collection = await this.ipfsModelManager.loadCollection();
        }
        catch(err){
            console.log(err);
            test_results.collection = err;
        }
        try{
            test_results.checkPinnedModels = {};
            // test_results.checkPinnedModels = await this.ipfsModelManager.checkPinnedModels();
        }
        catch(err){
            console.log(err);
            test_results.checkPinnedModels = err;
        }
        try{
            test_results.checkHistoryModels = {};
            // test_results.checkHistoryModels = await this.ipfsModelManager.checkHistoryModels();
        }
        catch(err){
            console.log(err);
            test_results.checkHistoryModels = err;
        }

        try {
            test_results.checkZombies = {};
            // test_results.checkZombies = await this.ipfsModelManager.checkZombies();
        }
        catch(err){
            console.log(err);
            test_results.checkZombies = err;
        }
        try{
            test_results.checkExpired = {};
            // test_results.checkExpired = await this.ipfsModelManager.checkExpired();
        }
        catch(err){
            console.log(err);
            test_results.checkExpired = err;
        }
        try{
            test_results.checkNotFound = {};
            // test_results.checkNotFound = await this.ipfsModelManager.checkNotFound();
        }
        catch(err){
            console.log(err);
            test_results.checkNotFound = err;
        }

        try{
            test_results.checkMissing = {};
            // test_results.test_asserts = await this.ipfsModelManager.test_asserts();
        }
        catch(err){
            console.log(err);
            test_results.test_asserts = err;
        }

        return test_results;
    }
}
export default testIpfsModelManager;

export class testS3Kit {
    constructor(resources = {}, metadata = {}) {
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
        this.libp2pKit = new libp2pKitJs(null, meta);
        console.log("libp2pKit: ", this.libp2pKit);
        // this.s3Kit = new this.libp2pKit.s3Kit(s3cfg);
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

export async function test_fio() {
    const thisTest = new TestFio(null);
    const results = thisTest.test("/tmp/");
    console.log(results);
    console.log("Test complete");
}

export async function test(){
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

    // const models_manager = new ipfsModelManagerJs(null, meta);
    // const results = await models_manager.test();
    console.log(results);
}

if (import.meta.url === 'file://' + process.argv[1]) {
    console.log("Running test");
    let test_results = {};
    // const testS3 = new testS3Kit();
    try{
        // await testS3.test().then((result) => {
        //     console.log("testS3Kit: ", result);
        // }).catch((error) => {
        //     console.log("testS3Kit error: ", error);
        //     // throw error;
        // });
        const testModelManager = new testIpfsModelManager();
        await testModelManager.init().then((init) => {
            test_results.init = init;
            console.log("testIpfsModelManager init: ", init);
            testModelManager.test().then((result) => {
                test_results.results = result;
                console.log("testIpfsModelManager: ", result);
            }).catch((error) => {
                test_results.results = error;
                console.log("testIpfsModelManager error: ", error);
                // throw error;
            });
        }).catch((error) => {
            test_results.init = error ;
            console.error("testIpfsModelManager init error: ", error);
            // throw error;
            testModelManager.test().then((result) => {
                test_results.results = result;
                console.log("testIpfsModelManager: ", result);
            }).catch((error) => {
                test_results.results = error;
                console.log("testIpfsModelManager error: ", error);
                // throw error;
            });
        });
        console.log(test_results);
        fs.writeFileSync("./tests/test_results.json", JSON.stringify(test_results, null, 2));
        let testResultsFile = "./tests/README.md";
        let testResults = "";
        for (let key in test_results) {
            testResults += key + "\n";
            testResults += "```json\n";
            testResults += JSON.stringify(test_results[key], null, 2);
            testResults += "\n```\n";
        }
        fs.writeFileSync(testResultsFile, testResults);
        if (Object.keys(test_results).includes("test_results") === false) {
            process.exit(0);
        }
        else{
            process.exit(1);
        }   
    }
    catch(err){
        console.log(err);
        // process.exit(1);
    }   
}