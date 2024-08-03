import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';
import { promisify } from 'util';
import { exec } from 'child_process';
import { ipfs_kit_js } from 'ipfs_kit_js';
//from './s3_kit.js' import S3Kit;
//import AWS from 'aws-sdk';
//import { S3 } from 'aws-sdk';
//import ipfsClient from 'ipfs-http-client';
import * as test_fio from './test_fio.js';
import * as s3_kit from './s3_kit.js';
import * as ipfs_kit from './ipfs_kit.js';
import * as install_ipfs from './ipfs_kit_lib/install_ipfs.js';
import fsExtra from 'fs-extra';
import crypto from 'crypto';
import rimraf from 'rimraf';
import _ from 'lodash';
import * as temp_file from "./tmp_file.js";

//const s3 = new AWS.S3();
//const ipfs = ipfsClient('http://localhost:5001');
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);
const moveFile = util.promisify(fs.rename);
const rimrafAsync = util.promisify(rimraf);
const tmpFile = new temp_file.TempFileManager()

class ModelManager {
    constructor(resources = null, meta = null) {
        
        this.models = {
            "s3_models": [],
            "ipfs_models": [],
            "local_models": [],
            "https_models": []
        };
        this.lshttpsModels = this.lshttpsModels.bind(this);
        this.lsIpfsModels = this.lsIpfsModels.bind(this);
        this.lsLocalModels = this.lsLocalModels.bind(this);
        this.lsS3Models = this.lsS3Models.bind(this);
        this.tmpFile = tmpFile;
        this.ipfsCollection = {};
        this.s3Collection = {};
        this.localCollection = {};
        this.httpsCollection = {};
        this.pinned = [];
        this.fastest = null;
        this.bandwidth = null;
        this.thisModelPath = null;
        this.thisModel = null;
        this.thisModelName = null;
        this.s3cfg = null;
        let username = os.userInfo().username;
        let localPath
        if (username === "root") {
            this.localPath = "/root/";
            localPath = this.localPath;
        } else {
            this.localPath = path.join(os.homeDir(), username);
            localPath = this.localPath;
        }
        if (meta !== null && typeof meta === 'object') {
            this.s3cfg = meta.s3cfg || null;
            this.ipfsSrc = meta.ipfs_src || null;
            this.timing = meta.timing || null;
            this.collectionCache = meta.cache || null;
            this.modelHistory = meta.history || null;
            this.role = meta.role || null;
            this.clusterName = meta.cluster_name || null;
            if (Object.keys(meta).includes("localPath")){
                this.localPath = meta.localPath;
            }
            else {
                this.localpath = path.join(localPath, ".cache/huggingface");
                meta.localPath = path.join(localPath, ".cache/huggingface");
            }
            if (Object.keys(meta).includes("ipfs_path")){
                this.ipfsPath = meta.ipfsPath || path.join(this.localPath  , ".cache/ipfs");
                meta.ipfsPath = meta.ipfsPath || path.join(this.localPath  , ".cache/ipfs");
            }
            else{
                this.ipfsPath = path.join(this.localPath, ".cache/ipfs");
                meta.ipfsPath = path.join(this.localPath, ".cache/ipfs");
            }
            this.ipfsPath = meta.ipfsPath || (this.localPath + "/.cache/ipfs");
            this.s3cfg = meta.s3cfg || null;
        } 
        else {
            this.localPath = path.join(this.ipfsPath , "cloudkit-models");
            // get the username of the current user and determine if its root
            this.s3cfg = null;
            this.role = "leecher";
            this.clusterName = "cloudkit_storage";
            this.cache = {
                "local": "/storage/cloudkit-models/collection.json",
                "s3": "s3://huggingface-models/collection.json",
                "ipfs": "QmXBUkLywjKGTWNDMgxknk6FJEYu9fZaEepv3djmnEqEqD",
                "https": "https://huggingface.co/endomorphosis/cloudkit-collection/resolve/main/collection.json"
            };
            meta = {
                "localPath": this.localPath || localPath,
                "ipfs_path": this.ipfsPath,
                "s3_cfg": this.s3cfg,
                "role": this.role,
                "cluster_name": this.clusterName,
                "cache": this.cache,
            };
        }

        let homeDir = os.homedir();
        let homeDirFiles = fs.readdirSync(homeDir);
        this.testFio = new test_fio.TestFio();
        this.s3Kit = new s3_kit.S3Kit(resources, meta);
        let installIpfs = new install_ipfs.InstallIPFS(resources, meta);
        this.ipfsKit = new ipfs_kit.IpfsKit(resources, meta);
        this.installIpfs = installIpfs;
        let ipfsPath = this.ipfsPath;
        if (!fs.existsSync(this.ipfsPath)) {
            fs.mkdirSync(this.ipfsPath, { recursive: true });
        }
        if (!fs.existsSync(this.localPath)) {
            fs.mkdirSync(this.localPath, { recursive: true });
        }
        let ipfsPathFiles = fs.readdirSync(ipfsPath);
        if (!ipfsPathFiles.includes('ipfs') || !fs.existsSync(ipfsPath)) {
            this.installIpfs.installIpfsDaemon();
            this.installIpfs.installIpget();
            let stats = this.testFio.stats(this.ipfsPath);
            this.installIpfs.configIpfs({
                diskStats: stats,
                ipfsPath: this.ipfsPath,
            });
        }            
        if (this.role === "master" && !homeDirFiles.includes('.ipfs-cluster-service')) {
            this.installIpfs.installIPFSClusterService();
            this.installIpfs.installIPFSClusterCtl();
            this.installIpfs.configIPFSClusterService();
            this.installIpfs.configIpfsClusterCtl();
        } else if (this.role === "worker" && !homeDirFiles.includes('.ipfs-cluster-follow')) {
            this.installIpfs.installIPFSClusterService();
            this.installIpfs.installIPFSClusterFollow();
            this.installIpfs.configIPFSClusterService();
            this.installIpfs.configIPFSClusterFollow();
        }

        this.ipfsKit.ipfsKitStop();
        this.ipfsKit.ipfsKitStart();
        let executeReady = false;
        while (executeReady != true) {
            try {
                let readyIpfsKit = this.ipfsKit.ipfsKitReady();
                if (Object.keys(readyIpfsKit).every(k => readyIpfsKit[k] === true) || readyIpfsKit === true){
                    executeReady = true
                }
                else{
                    executeReady = false
                }
            } catch (e) {
                executeReady = e.toString();
            }
        }

        this.models = {};
        this.lastUpdate = 0.1;
        this.historyModels = {};
        this.pinnedModels = {};
        this.collection = {};
        this.collectionPins = [];
        this.zombies = {};
        this.expired = {};
        this.notFound = [];
        this.ipfsPinset = {
            "ipfs": {},
            "ipfs_cluster": {},
        };
    }

    async call(method, kwargs) {
        switch (method) {
            case "loadCollection":
                return this.loadCollection(kwargs);
            case "download_model":
                return this.downloadModel(kwargs);
            case "loadCollection_cache":
                return this.loadCollectionCache(kwargs);
            case "autoDownload":
                return this.autoDownload(kwargs);
            case "lsModels":
                return this.lsModels(kwargs);
            case "lsS3Models":
                return this.lsS3Models(kwargs);
            case "check_local":
                return this.checkLocal(kwargs);
            case "check_https":
                return this.checkHttps(kwargs);
            case "check_s3":
                return this.checkS3(kwargs);
            case "check_ipfs":
                return this.checkIpfs(kwargs);
            case "download_https":
                return this.downloadHttps(kwargs);
            case "download_s3":
                return this.downloadS3(kwargs);
            case "download_ipfs":
                return this.downloadIpfs(kwargs);
            case "test":
                return this.test(kwargs);
            default:
                throw new Error(`Method ${method} not found`);
        }
    }

    async loadCollection(kwargs) {
        try {
            this.httpsCollection = await this.downloadHttps('https://huggingface.co/endomorphosis/cloudkit-collection/resolve/main/collection.json', "/tmp/");
            this.httpsCollection = JSON.parse(fs.readFileSync(this.httpsCollection, 'utf8'));
        } catch (e) {
            this.httpsCollection = e;
        }
    
        try {
            let thisTempFile = await new Promise((resolve, reject) => {
                this.tmpFile.createTempFile({  postfix: '.json', dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ name: path, fd, removeCallback: cleanupCallback });
                    }
                });
            });
    
            let results = await this.ipfsKit.ipfsGet(this.ipfsSrc, thisTempFile.name);
            if (results && results.length > 0) {
                this.ipfsCollection = JSON.parse(fs.readFileSync(thisTempFile.name, 'utf8'));
            } else {
                this.ipfsCollection = { "error": "no results" };
            }
        } catch (e) {
            this.ipfsCollection = { "error": e.toString() };
        }
    
        try {
            let thisTempFile = await new Promise((resolve, reject) => {
                tmpFile.createTempFile({  postfix: '.json', dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ name: path, fd, removeCallback: cleanupCallback });
                    }
                });
            });
    
            await this.s3Kit.s3DlFile('collection.json', thisTempFile.name, this.s3cfg["bucket"]);
            this.s3Collection = JSON.parse(fs.readFileSync(thisTempFile.name, 'utf8'));
        } catch (e) {
            this.s3Collection = e;
        }
    
        if (fs.existsSync(path.join(this.ipfsPath, "collection.json"))) {
            this.localCollection = JSON.parse(fs.readFileSync(path.join(this.ipfsPath, "collection.json"), 'utf8'));
        }
    
        let ipfsStop, ipfsStart;
        try {
            ipfsStop = await this.ipfsKit.ipfsKitStop();
        } catch (e) {
            ipfsStop = e;
        }
    
        try {
            ipfsStart = await this.ipfsKit.ipfsKitStart();
        } catch (e) {
            ipfsStart = e;
        }
    
        return {
            "ipfs_stop": ipfsStop,
            "ipfs_start": ipfsStart,
            "ipfsCollection": this.ipfsCollection,
            "s3Collection": this.s3Collection,
            "localCollection": this.localCollection,
            "httpsCollection": this.httpsCollection
        };
    }

    async downloadHttps(httpsSrc, modelPath, kwargs) {
        let suffix = "." + httpsSrc.split("/").pop().split(".").pop();
        let dstPath, filename, dirname;

        if (fs.existsSync(modelPath)) {
            if (fs.lstatSync(modelPath).isDirectory()) {
                filename = httpsSrc.split("/").pop();
                dstPath = path.join(modelPath, filename);
            } else {
                filename = httpsSrc.split("/").pop();
                dirname = path.dirname(modelPath);
                dstPath = path.join(dirname, filename);
            }
        } else {
            dirname = path.dirname(modelPath);
            filename = httpsSrc.split("/").pop();
            if (fs.existsSync(dirname)) {
                dstPath = path.join(dirname, filename);
            } else {
                fs.mkdirSync(dirname, { recursive: true });
                dstPath = path.join(dirname, filename);
            }
        }
        try{
            let thisTempFile = await new Promise((resolve, reject) => {
                this.tmpFile.createTempFile({  postfix: suffix, dir: '/tmp' }, async (err, path, fd, cleanupCallback) => {                    
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else {  
                        let tmpFilename = path.split("/").pop();
                        let command = `aria2c -x 16 ${httpsSrc} -d /tmp -o ${tmpFilename} --allow-overwrite=true`;          
                        await execsync(command).then((results) => {
                            console.log(results)
                            resolve({ name: path, fd, removeCallback: cleanupCallback });
                        }).catch((e) => {
                            console.log(e);
                            reject(e);
                        });
                    }   
                });
            });
        }
        catch(e){
            console.log(e);
        }


        if (fs.existsSync(dstPath)) {
            let command2 = `rm ${dstPath}`;
            await exec(command2);
        }

        if (!dstPath.includes("collection.json") && !dstPath.includes("README.md")) {
            let command3 = `mv /tmp/${tmpFilename} ${dstPath}`;
            await exec(command3);

            if (fs.existsSync(thisTempFile.name)) {
                let command4 = `rm /tmp/${tmpFilename}`;
                await exec(command4);
            }
        } else {
            let command3 = `cp /tmp/${tmpFilename} ${dstPath}`;
            await exec(command3);

            if (fs.existsSync(thisTempFile.name)) {
                let command4 = `rm /tmp/${tmpFilename}`;
                await exec(command4);
            }
        }

        return dstPath;
    }

    async downloadS3(s3Src, filenameDst, kwargs) {
        if (filenameDst.split(".").length > 1) {
            try {
                let suffix = "." + filenameDst.split(".").pop();
                let thisTempFile = await new Promise((resolve, reject) => {
                    tmpFile.createTempFile({  postfix: suffix, dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ name: path, fd, removeCallback: cleanupCallback });
                        }
                    });
                });
    
                let thisFileKey = s3Src.split(s3cfg["bucket"] + "/")[1];

                let params = {
                    Bucket: s3cfg["bucket"],
                    Key: thisFileKey
                };

                let file = fs.createWriteStream(thisTempFile.name);
                let stream = s3.getObject(params).createReadStream().pipe(file);

                await new Promise((resolve, reject) => {
                    stream.on('finish', resolve);
                    stream.on('error', reject);
                });

                let results = fs.existsSync(thisTempFile.name);
                if (results) {
                    fs.renameSync(thisTempFile.name, filenameDst);

                    if (fs.existsSync(thisTempFile.name)) {
                        fs.unlinkSync(thisTempFile.name);
                    }

                    return filenameDst;
                } else {
                    return false;
                }
            } catch (e) {
                if (fs.existsSync(thisTempFile.name)) {
                    fs.unlinkSync(thisTempFile.name);
                }
                return e;
            }
        } else {
            throw new Error("Invalid filenameDst, no `.` suffix found");
        }
    }

    async downloadIpfs(ipfsSrc, filenameDst, kwargs) {
        if (filenameDst.split(".").length > 1) {
            try {
                if (!filenameDst.includes(".cache") && filenameDst.includes(".")) {
                    let suffix = "." + filenameDst.split(".").pop();
                    let thisTempFile = await new Promise((resolve, reject) => {
                        tmpFile.createTempFile({  postfix: suffix, dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({ name: path, fd, removeCallback: cleanupCallback });
                            }
                        });
                    });
        
                    let results = await ipfs.get(ipfsSrc, { timeout: 10000 });
                    if (results.path) {
                        fs.renameSync(results.path, filenameDst);

                        if (fs.existsSync(thisTempFile.name)) {
                            fs.unlinkSync(thisTempFile.name);
                        }

                        return filenameDst;
                    } else {
                        throw new Error("No path in results or timeout");
                    }
                } else {
                    let tempDir = tmp.dirSync({ dir: '/tmp' });
                    let results = await ipfs.get(ipfsSrc, { timeout: 10000 });

                    if (results.path) {
                        fs.renameSync(results.path, filenameDst);
                        return filenameDst;
                    }
                }
            } catch (e) {
                console.log("Exception thrown remove files");
                if (fs.existsSync(thisTempFile.name)) {
                    fs.unlinkSync(thisTempFile.name);
                }
                return e;
            }
        } else {
            // throw new Error("Invalid filenameDst, no `.` suffix found");
        }
    }


    async downloadModel(model, kwargs) {
        let ipfs_timestamp = null;
        let s3Timestamp = null;
        let localTimestamp = null;
        let https_timestamp = null;

        if (typeof this.ipfsCollection === 'object' && this.ipfsCollection.hasOwnProperty('cache')) {
            if (this.ipfsCollection.cache.hasOwnProperty('timestamp')) {
                ipfs_timestamp = this.ipfsCollection.cache.timestamp;
            }
            if (ipfs_timestamp === null) {
                ipfs_timestamp = Date.now();
            }
        }

        // Assuming s3_kit.s3_ls_file is an async function
        if (typeof this.s3Collection === 'object' && this.s3Collection.hasOwnProperty('cache')) {
            if (this.s3Collection.cache.hasOwnProperty('timestamp')) {
                s3Timestamp = this.s3Collection.cache.timestamp;
            }
            if (s3Timestamp === null) {
                let s3File = path.basename(this.collectionCache.s3);
                let s3Dir = path.dirname(this.collectionCache.s3);
                s3Timestamp = await this.s3Kit.s3_ls_file(s3File, s3Dir);
                let key = Object.keys(s3Timestamp)[0];
                s3Timestamp = s3Timestamp[key].last_modified;
            }
        }

        if (typeof this.localCollection === 'object' && this.localCollection.hasOwnProperty('cache')) {
            if (this.localCollection.cache.hasOwnProperty('timestamp')) {
                localTimestamp = this.localCollection.cache.timestamp;
            }
            if (localTimestamp === null) {
                localTimestamp = fs.statSync(this.collectionCache.local).mtimeMs;
            }
        }

        if (typeof this.httpsCollection === 'object' && this.httpsCollection.hasOwnProperty('cache')) {
            if (this.httpsCollection.cache.hasOwnProperty('timestamp')) {
                https_timestamp = this.httpsCollection.cache.timestamp;
            }
            if (https_timestamp === null) {
                https_timestamp = Date.now();
            }
        }

        let timestamps = {
            ipfs: ipfs_timestamp,
            s3: s3Timestamp,
            local: localTimestamp,
            https: https_timestamp
        };

        if (!Object.values(timestamps).every(v => v === null)) {
            timestamps = Object.fromEntries(Object.entries(timestamps).filter(([k, v]) => v !== null));
            let newest = Object.keys(timestamps).reduce((a, b) => timestamps[a] > timestamps[b] ? a : b);
        } else {
            throw new Error("No collection cache found");
        }

        let ipfsModelData = null;
        let s3ModelData = null;
        let localModelData = null;
        let httpsModelData = null;

        if (typeof this.ipfsCollection === 'object' && this.ipfsCollection.hasOwnProperty(model)) {
            ipfsModelData = this.ipfsCollection[model];
        }
        if (typeof this.s3Collection === 'object' && this.s3Collection.hasOwnProperty(model)) {
            s3ModelData = this.s3Collection[model];
        }
        if (typeof this.localCollection === 'object' && this.localCollection.hasOwnProperty(model)) {
            localModelData = this.localCollection[model];
        }
        if (typeof this.httpsCollection === 'object' && this.httpsCollection.hasOwnProperty(model)) {
            httpsModelData = this.httpsCollection[model];
        }

        let modelData = {
            ipfs: ipfsModelData,
            s3: s3ModelData,
            local: localModelData,
            https: httpsModelData
        };

        if (Object.values(modelData).every(v => v === null)) {
            throw new Error("Model not found");
        }

        let thisModel = null;

        if (modelData[newest] !== null) {
            if (modelData[newest].hwRequirements.diskUsage > os.freemem()) {
                throw new Error("Not enough disk space to download model");
            } else {
                thisModel = await this.autoDownload(modelData[newest], kwargs);
            }
        } else {
            while (thisModel === null && Object.keys(timestamps).length > 0) {
                delete timestamps[newest];
                newest = Object.keys(timestamps).reduce((a, b) => timestamps[a] > timestamps[b] ? a : b);
            }

            if (modelData[newest] !== null) {
                if (modelData[newest].hwRequirements.diskUsage > os.freemem()) {
                    throw new Error("Not enough disk space to download model");
                } else {
                    thisModel = await this.autoDownload(modelData[newest], kwargs);
                }
            }

            if (thisModel === null) {
                throw new Error("Model not found");
            }
            this.models.local_models[thisModel.id] = Date.now();
        }
        return thisModel;
    }

    async checkLocal(manifest, kwargs) {
        let folderData = manifest["folderData"];
        let cache = manifest["cache"];
        let local = cache["local"];
        let checkFilenames = {};
        let localFiles = Object.keys(local);
        let localPath = this.localPath + "/" + manifest["id"] + "/";
        for (let localFile of localFiles) {
            let thisFile = local[localFile];
            // remove the first character if it is a "/"
            let thisFileUrl = thisFile["url"];
            let thisFilePath = thisFile["path"];
            let thisLocalFile;
            if (thisFilePath[0] == "/") {
                thisLocalFile = thisFilePath.slice(1);
            } else {
                thisLocalFile = thisFilePath;
            }
            thisFilePath = path.join(localPath, thisLocalFile);
            if (fs.existsSync(thisFilePath)) {
                let thisFileMtime = fs.statSync(thisFilePath).mtimeMs;
                checkFilenames[localFile] = thisFileMtime;
            } else {
                checkFilenames[localFile] = false;
            }
        }

        checkFilenames["/manifest.json"] = true;
        if (Object.values(checkFilenames).every(Boolean)) {
            delete checkFilenames["/manifest.json"];
            let oldestFileTimestamp = Math.min(...Object.values(checkFilenames));
            return oldestFileTimestamp;
        } else {
            return false;
        }
    }


    async checkHttps(manifest, kwargs) {
        let folderData = manifest["folderData"];
        let cache = manifest["cache"];
        let https = cache["https"];
        let httpsFiles = Object.keys(https);
        let checkFilenames = {};
        for (let httpsFile of httpsFiles) {
            let thisHttpsFile = https[httpsFile];
            if ("url" in thisHttpsFile && httpsFile != "/manifest.json") {
                let thisHttpsUrl = thisHttpsFile["url"];
                try {
                    let results = await axios.head(thisHttpsUrl);
                    if (results.status === 200 || results.status === 302) {
                        checkFilenames[httpsFile] = Date.now();
                    } else {
                        checkFilenames[httpsFile] = false;
                    }
                } catch (e) {
                    checkFilenames[httpsFile] = false;
                }
            } else {
                checkFilenames[httpsFile] = false;
            }
        }

        checkFilenames["/manifest.json"] = true;
        if (Object.values(checkFilenames).every(Boolean)) {
            return Date.now();
        } else {
            return false;
        }
    }

    async checkS3(manifest, kwargs) {
        let folderData = manifest["folderData"];
        let files = Object.keys(folderData);
        let cache = manifest["cache"];
        let s3Cache = cache["s3"];
        let s3Files = Object.keys(s3Cache);
        let checkFilenames = {};
        if (s3Files !== null) {
            for (let s3File of s3Files) {
                let thisS3Cache = s3Cache[s3File];
                let thisS3Path = thisS3Cache["path"];
                let thisS3Url = thisS3Cache["url"];
                let thisS3Split, thisS3Bucket, thisS3Key;
                if (thisS3Url.includes("s3://")) {
                    thisS3Split = thisS3Url.split("/");
                    thisS3Bucket = thisS3Split[2];
                    thisS3Key = thisS3Split.slice(3).join("/");
                } else if (thisS3Url[0] === "/") {
                    thisS3Split = thisS3Path.split("/");
                    thisS3Bucket = thisS3Split[2];
                    thisS3Key = thisS3Split.slice(3).join("/");
                }

                try {
                    let results = await this.s3Kit.s3LsFile(thisS3Key, thisS3Bucket);
                    if (results !== null && results !== false && Object.keys(results).length > 0) {
                        let filename = Object.keys(results)[0];
                        let fileMetadata = results[filename];
                        let mtime = new Date(fileMetadata["LastModified"]).getTime();
                        checkFilenames[s3File] = mtime;
                    } else {
                        checkFilenames[s3File] = false;
                    }
                } catch (e) {
                    checkFilenames[s3File] = e;
                }
            }
        }

        checkFilenames["/manifest.json"] = true;
        if (Object.values(checkFilenames).every(Boolean)) {
            delete checkFilenames["/manifest.json"];
            let oldestFileTimestamp = Math.min(...Object.values(checkFilenames));
            return oldestFileTimestamp;
        } else {
            return false;
        }
    }


    async checkIpfs(manifest, kwargs) {
        let folderData = manifest["folderData"];
        let cache = manifest["cache"];
        let ipfsCache = cache["ipfs"];
        let ipfsFiles = Object.keys(ipfsCache);
        let checkFilenames = {};
        let ipfsPinset = Object.keys(this.ipfsPinset["ipfs"]);
        for (let ipfsFile of ipfsFiles) {
            let thisIpfsCache = ipfsCache[ipfsFile];
            if ("path" in thisIpfsCache && ipfsFile != "/manifest.json") {
                let thisIpfsCid = thisIpfsCache["path"];
                try {
                    if (ipfsPinset.includes(thisIpfsCid)) {
                        checkFilenames[ipfsFile] = Date.now();
                    } else {
                        checkFilenames[ipfsFile] = false;
                    }
                } catch (e) {
                    checkFilenames[ipfsFile] = false;
                }
            } else {
                checkFilenames[ipfsFile] = false;
            }
        }

        checkFilenames["/manifest.json"] = true;
        if (Object.values(checkFilenames).every(Boolean)) {
            return Date.now();
        } else {
            return false;
        }
    }

    async loadCollectionCache(cache = {
        local: "/storage/cloudkit-models/collection.json",
        s3: "s3://cloudkit-beta/collection.json",
        ipfs: "QmXBUkLywjKGTWNDMgxknk6FJEYu9fZaEepv3djmnEqEqD",
        https: "https://huggingface.co/endomorphosis/cloudkit-collection/resolve/main/collection.json"
    }){
        let timestamp_0 = Date.now();
        if (fs.existsSync(cache.local)) {
            let data = await readFile(cache.local);
            this.localCollection = JSON.parse(data);
        }
        try {
            let httpsCollection = await this.downloadHttps(cache.https, '/tmp/collection.json');
            // if (fs.existsSync("./collection.json/collection.json")) {
            //     await moveFile("./collection.json/collection.json", "/tmp/collection.json");
            //     await rimraf("./collection.json");
            // }
            if (fs.existsSync(httpsCollection)) {
                let data = await fs.readFileSync(cache.https, 'utf8');
                this.httpsCollection = JSON.parse(data);
            } else if (fs.existsSync('/tmp/collection.json')) {
                let data = await readFile('/tmp/collection.json');
                this.httpsCollection = JSON.parse(data);
            }
        } catch (e) {
            console.log(e);
        }
        let timestamp_1 = Date.now();
        try {
            let ipfsDownload = await this.downloadIpfs(cache.ipfs, '/tmp/collection.json');
            let data = await readFile(ipfsDownload);
            this.ipfsCollection = JSON.parse(data);
        } catch (e) {
            console.log(e);
        }
        let timestamp_2 = Date.now();
        try {
            let s3Download = await this.downloadS3(cache.s3, '/tmp/collection.json');
//            let s3_download = await this.download_s3(cache.s3, '/tmp/collection.json');
            let data = await readFile(s3Download);
            this.s3Collection = JSON.parse(data);
        } catch (e) {
            console.log(e);
        }
        let timestamp_3 = Date.now();

        let timestamps = {
            https: timestamp_1 - timestamp_0,
            ipfs: timestamp_2 - timestamp_1,
            s3: timestamp_3 - timestamp_2
        };

        let fastest = Object.keys(timestamps).reduce((a, b) => timestamps[a] < timestamps[b] ? a : b);
        this.fastest = fastest;
        let file_size = (await stat('/tmp/collection.json')).size;
        this.bandwidth = file_size / timestamps[fastest];

        let md5_local = crypto.createHash('md5').update(JSON.stringify(this.localCollection)).digest("hex");
        let md5_ipfs = crypto.createHash('md5').update(JSON.stringify(this.ipfsCollection)).digest("hex");
        let md5_s3 = crypto.createHash('md5').update(JSON.stringify(this.s3Collection)).digest("hex");
        let md5_https = crypto.createHash('md5').update(JSON.stringify(this.httpsCollection)).digest("hex");


        if (md5_local === md5_ipfs && md5_local === md5_s3 && md5_local === md5_https) {
            if (fastest === "ipfs" && Object.keys(this.ipfsCollection).length > 0) {
                this.collection = this.ipfsCollection;
            } else if (fastest === "s3" && Object.keys(this.s3Collection).length > 0) {
                this.collection = this.s3Collection;
            } else if (fastest === "https" && Object.keys(this.httpsCollection).length > 0) {
                this.collection = this.httpsCollection;
            } else if (fastest === "local" && Object.keys(this.localCollection).length > 0) {
                this.collection = this.localCollection;
            } else if (Object.keys(this.localCollection).length > 0) {
                this.collection = this.localCollection;
            } else {
                throw new Error("No collection found");
            }
        }

        let localCollectionCache = this.localCollection.cache || {};
        let ipfsCollectionCache = this.ipfsCollection.cache || {};
        let s3CollectionCache = this.s3Collection.cache || {};
        let httpsCollectionCache = this.httpsCollection.cache || {};

        let modified = {};
        if (localCollectionCache.timestamp) {
            modified.local = localCollectionCache.timestamp;
        }
        if (ipfsCollectionCache.timestamp) {
            modified.ipfs = ipfsCollectionCache.timestamp;
        }
        if (s3CollectionCache.timestamp) {
            modified.s3 = s3CollectionCache.timestamp;
        }
        if (httpsCollectionCache.timestamp) {
            modified.https = httpsCollectionCache.timestamp;
        }

        if (Object.keys(modified).length > 0) {
            let newest = Object.keys(modified).reduce((a, b) => modified[a] > modified[b] ? a : b);
            this.collection = this[newest + "_collection"];
        } else {
            let sizes = {
                local: JSON.stringify(this.localCollection).length,
                ipfs: JSON.stringify(this.ipfsCollection).length,
                s3: JSON.stringify(this.s3Collection).length,
                https: JSON.stringify(this.httpsCollection).length
            };
            let largest = Object.keys(sizes).reduce((a, b) => sizes[a] > sizes[b] ? a : b);
            this.collection = this[largest + "_collection"];
        }

        if (fs.existsSync(cache.local)) {
            let data = await readFile(cache.local);
            this.localCollection = JSON.parse(data);
        }

        return this.collection;
    }


    async autoDownload(manifest, kwargs) {
        let lsModels = this.lsModels();
        let thisModelManifest = manifest;
        this.historyModels[thisModelManifest["id"]] = Date.now();
        let thisModelManifestCache = thisModelManifest["cache"];
        let thisModelManifestFolderData = thisModelManifest["folderData"];
        let s3Test = false;
        let ipfsTest = false;
        let httpsTest = false;
        let localTest = false;

        // Local test
        try {
            if (fs.existsSync(thisModelManifestCache["local"]["/README.md"]["path"])) {
                localTest = true;
                let basename = path.basename(thisModelManifestCache["local"]["/README.md"]["path"]);
                for (let file of thisModelManifestFolderData) {
                    if (!fs.existsSync(path.join(basename, file))) {
                        localTest = false;
                        break;
                    }
                }
            }
        } catch (e) {
            localTest = false;
        }

        let timestamp_0 = Date.now();

        // IPFS test
        try {
            ipfsTest = false;
            let thisTempFile = await new Promise((resolve, reject) => {
                tmpFile.createTempFile({ postfix: '.md' , dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ name: path, fd, removeCallback: cleanupCallback });
                    }
                });
            });

            if ("/README.md" in Object.keys(thisModelManifestCache["ipfs"])) {
                let ipfsTest_file = await this.download_ipfs(thisModelManifestCache["ipfs"]["/README.md"]["path"], this_temp_file.name);
                let ipfsTest = fs.readFileSync(ipfsTest_file, 'utf8');
                ipfsTest = ipfsTest.length > 0;
            }
        } catch (e) {
            ipfsTest = e;
        }

        let timestamp_1 = Date.now();

        // S3 test
        try {
            let thisTempFile = await new Promise((resolve, reject) => {
                tmp.createTempFile({ postfix: '.md' , dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ name: path, fd, removeCallback: cleanupCallback });
                    }
                });
            });
            if ("/README.md" in Object.keys(thisModelManifestCache["s3"])) {
                let s3Test;
                if (thisModelManifestCache["s3"]["/README.md"]["url"].startsWith("s3://")) {
                    s3Test = await this.download_s3(thisModelManifestCache["s3"]["/README.md"]["url"], this_temp_file.name);
                } else {
                    s3Test = await this.download_s3(thisModelManifestCache["s3"]["/README.md"]["path"], this_temp_file.name);
                }
                s3Test = s3Test.toString();
                if (!s3Test.includes("error")) {
                    let s3Test = fs.readFileSync(this_temp_file.name, 'utf8');
                    s3Test = s3Test.length > 0;
                } else {
                    s3Test = false;
                }
            }
        } catch (e) {
            s3Test = e;
        }

        let timestamp_2 = Date.now();

        // HTTPS test
        try {
            let thisTempFile = await new Promise((resolve, reject) => {
                tmpFile.createTempFile({ postfix: '.md' , dir: '/tmp' }, (err, path, fd, cleanupCallback) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ name: path, fd, removeCallback: cleanupCallback });
                    }
                });
            });
            if ("/README.md" in Object.keys(thisModelManifestCache["https"])) {
                let https_url = thisModelManifestCache["https"]["/README.md"]["url"];
                let httpsTest_file = await this.download_https(https_url, this_temp_file.name);
                let httpsTest = fs.readFileSync(httpsTest_file, 'utf8');
                httpsTest = httpsTest.length > 0;
            }
        } catch (e) {
            httpsTest = e;
        }

        let timestamp_3 = Date.now();

        let timestamps = {
            "ipfs": timestamp_1 - timestamp_0,
            "s3": timestamp_2 - timestamp_1,
            "https": timestamp_3 - timestamp_2,
            "local": 0
        };

        let test = {
            "ipfs": ipfsTest,
            "s3": s3Test,
            "https": httpsTest,
            "local": localTest
        };

        let downloadSrc = null;
        let fastest = Object.keys(timestamps).reduce((a, b) => timestamps[a] < timestamps[b] ? a : b);

        while (test[fastest] === false || test[fastest] !== true) {
            delete timestamps[fastest];
            fastest = Object.keys(timestamps).reduce((a, b) => timestamps[a] < timestamps[b] ? a : b);
        }

        if (test[fastest] === true) {
            downloadSrc = fastest;
        } else {
            downloadSrc = null;
        }


        if (downloadSrc === null) {
            throw new Error("Model not found");
        } else {
            let fileList = Object.keys(thisModelManifestFolderData);
            let fileSuccess = {};
            for (let file of fileList) {
                if (!file.startsWith("/")) {
                    file = "/" + file;
                }
                let suffix = null;
                if (file.includes(".")) {
                    suffix = "." + file.split(".").pop();
                } else {
                    fs.mkdirSync("/tmp/"+file, { recursive: true });
                }
                let thisDownloadSrc = downloadSrc;
                let thisFileSize = thisModelManifestFolderData[file]["size"];
                let thisFileMd5 = thisModelManifestFolderData[file].hasOwnProperty("md5") ? thisModelManifestFolderData[file]["md5"] : null;
                let thisTmpFile = "/tmp/" + file.split("/").slice(1).join("/");
                let thisLocalFile = this.localPath + "/" + thisModelManifest["id"] + thisModelManifestCache["local"][file]["path"].slice(1);
                let thisLocalFileSize = null;
                let thisLocalFileMd5 = null;
                if (fs.existsSync(thisLocalFile)) {
                    thisLocalFileSize = fs.statSync(thisLocalFile).size;
                    thisLocalFileMd5 = child_process.execSync("md5sum " + thisLocalFile).toString().split(" ")[0];
                }
                if ((file === "/README.md" || file === "/manifest.json") || (thisFileSize === thisLocalFileSize || thisFileSize === null) && (thisFileMd5 === thisLocalFileMd5 || thisFileMd5 === null)) {
                    fileSuccess[file] = true;
                } else {
                    // Implement the download_ipfs, download_s3, and download_https methods here
                }
            }
            if (Object.values(fileSuccess).every(value => value === true)) {
                if (!fs.existsSync(this.localPath + "/" + thisModelManifest["id"])) {
                    fs.mkdirSync(this.localPath + "/" + thisModelManifest["id"], { recursive: true });
                }
                for (let file of fileList) {
                    if (file.startsWith("/")) {
                        file = file.slice(1);
                    }
                    let srcPath = "/tmp/" + file;
                    let dstPath = this.localPath + "/" + thisModelManifest["id"] + "/" + file;
                    if (!fs.existsSync(dstPath) && fs.existsSync(srcPath)) {
                        if (fs.lstatSync(srcPath).isDirectory()) {
                            fs.mkdirSync(dstPath, { recursive: true });
                            child_process.execSync("cp -r " + srcPath + "/* " + dstPath);
                            child_process.execSync("rm -r " + srcPath);
                        } else {
                            fs.renameSync(srcPath, dstPath);
                        }
                    }
                }
                return thisModelManifest;
            } else {
                throw new Error("Model not found");
            }
        }
    }

    async lsModels() {
        let ipfsKeys = [];
        let s3Keys = [];
        let localKeys = [];
        let httpsKeys = [];
        if (this.ipfsCollection !== null && _.isObject(this.s3Collection)) {
            ipfsKeys = Object.keys(this.ipfsCollection);
        }
        if (this.s3Collection !== null && _.isObject(this.s3Collection)) {
            s3Keys = Object.keys(this.s3Collection);
        }
        if (this.localCollection !== null && _.isObject(this.s3Collection)) {
            localKeys = Object.keys(this.localCollection);
        }
        if (this.httpsCollection !== null && _.isObject(this.s3Collection)) {
            httpsKeys = Object.keys(this.httpsCollection);
        }
        let all_keys = _.union(ipfsKeys, s3Keys, localKeys, httpsKeys);
        all_keys = _.without(all_keys, "cache", "error");
        return all_keys;
    }


    async lsS3Models() {
        let lsModels = this.lsModels();
        let s3Models = {};
        let timestamps = {};
        let thisCollection;
        let collections = {
            'ipfs': this.ipfsCollection,
            's3': this.s3Collection,
            'local': this.localCollection,
            'https': this.httpsCollection
        };

        for (let key in collections) {
            if (_.isObject(collections[key]) && collections[key].hasOwnProperty('cache') && collections[key]['cache'].hasOwnProperty('timestamp')) {
                timestamps[key] = collections[key]['cache']['timestamp'];
            }
        }

        if (Object.keys(timestamps).length !== 0) {
            let newest = Object.keys(timestamps).reduce((a, b) => timestamps[a] > timestamps[b] ? a : b);
            thisCollection = collections[newest];
        } else {
            for (let key in collections) {
                if (Object.keys(collections).includes(key) && collections[key] != undefined && !collections[key].hasOwnProperty('error')) {
                    thisCollection = collections[key];
                    for (let model of lsModels) {
                        if (thisCollection.hasOwnProperty(model) && model !== "cache" && model !== "error") {
                            let results = this.checkS3(thisCollection[model]);
                            if (results !== null && results !== false) {
                                s3Models[model] = results;
                            }
                        }
                    }            
                    break;
                }
            }
        }

        this.s3Models = s3Models;
        return s3Models;
    }

    async lsLocalModels(kwargs) {
        let lsModels = this.lsModels();
        let localModels = {};
        let timestamps = {};
    
        if (typeof this.ipfsCollection === 'object' && 'cache' in this.ipfsCollection) {
            if ('timestamp' in this.ipfsCollection.cache) {
                let ipfs_timestamp = this.ipfsCollection.cache.timestamp;
                timestamps.ipfs = ipfs_timestamp;
            }
        }
        if (typeof this.s3Collection === 'object' && 'cache' in this.s3Collection) {
            if ('timestamp' in this.s3Collection.cache) {
                let s3Timestamp = this.s3Collection.cache.timestamp;
                timestamps.s3 = s3Timestamp;
            }
        }
        if (typeof this.localCollection === 'object' && 'cache' in this.localCollection) {
            if ('timestamp' in this.localCollection.cache) {
                let localTimestamp = this.localCollection.cache.timestamp;
                timestamps.local = localTimestamp;
            }
        }
        if (typeof this.httpsCollection === 'object' && 'cache' in this.httpsCollection) {
            if ('timestamp' in this.httpsCollection.cache) {
                let https_timestamp = this.httpsCollection.cache.timestamp;
                timestamps.https = https_timestamp;
            }
        }
    
        let thisCollection;
        if (Object.keys(timestamps).length !== 0) {
            let newest = Object.keys(timestamps).reduce((a, b) => timestamps[a] > timestamps[b] ? a : b);
            if (newest === 'local') {
                thisCollection = this.localCollection;
            } else if (newest === 's3') {
                thisCollection = this.s3Collection;
            } else if (newest === 'ipfs') {
                thisCollection = this.ipfsCollection;
            } else if (newest === 'https') {
                thisCollection = this.httpsCollection;
            }
        } else {
            if (!('error' in this.localCollection)) {
                thisCollection = this.localCollection;
            } else if (!('error' in this.s3Collection)) {
                thisCollection = this.s3Collection;
            } else if (!('error' in this.httpsCollection)) {
                thisCollection = this.httpsCollection;
            } else if (!('error' in this.ipfsCollection)) {
                thisCollection = this.ipfsCollection;
            }
        }
    
        for (let model of lsModels) {
            let collections = [thisCollection, this.localCollection, this.s3Collection, this.ipfsCollection, this.httpsCollection];
            for (let collection of collections) {
                if (model in collection && model !== 'cache' && model !== 'error') {
                    let thisFolderData = collection[model].folderData;
                    let results = this.checkLocal(collection[model]);
                    if (results !== null && results !== false) {
                        localModels[model] = results;
                    }
                }
            }
        }
    
        this.localModels = localModels;
        return localModels;
    }

    async lshttpsModels() {
        let lsModels = this.lsModels();
        let httpsModels = {};
        let timestamps = {};
        let thisCollection;
        let collections = {
            'ipfs': this.ipfsCollection,
            's3': this.s3Collection,
            'local': this.localCollection,
            'https': this.httpsCollection
        };

        for (let key in collections) {
            if (_.isObject(collections[key]) && collections[key].hasOwnProperty('cache') && collections[key]['cache'].hasOwnProperty('timestamp')) {
                timestamps[key] = collections[key]['cache']['timestamp'];
            }
        }

        if (Object.keys(timestamps).length !== 0) {
            let newest = Object.keys(timestamps).reduce((a, b) => timestamps[a] > timestamps[b] ? a : b);
            thisCollection = collections[newest];
        } else {
            for (let key in collections) {
                if (Object.keys(collections).includes(key) && collections[key] != undefined && !collections[key].hasOwnProperty('error')) {
                    thisCollection = collections[key];
                    break;
                }
            }
        }

        for (let model of lsModels) {
            if (thisCollection.hasOwnProperty(model) && model !== "cache" && model !== "error") {
                let results = this.check_https(thisCollection[model]);
                if (results !== null && results !== false) {
                    httpsModels[model] = results;
                }
            } else {
                for (let key in collections) {
                    if (Object.keys(collections).includes(key) && collections[key] != undefined && !collections[key].hasOwnProperty('error')) {
                        thisCollection = collections[key];
                        for (let model of lsModels) {
                            if (thisCollection.hasOwnProperty(model) && model !== "cache" && model !== "error") {
                                let results = this.checkS3(thisCollection[model]);
                                if (results !== null && results !== false) {
                                    s3Models[model] = results;
                                }
                            }
                        }            
                        break;
                    }
                }
            }
        }

        this.httpsModels = httpsModels;
        return httpsModels;
    }


    async lsIpfsModels() {
        let lsModels = await this.lsModels();
        let ipfsModels = {};
        let timestamps = {};
        let thisCollection;
        let collections = {
            'ipfs': this.ipfsCollection,
            's3': this.s3Collection,
            'local': this.localCollection,
            'https': this.httpsCollection
        };

        for (let key in collections) {
            if (_.isObject(collections[key]) && collections[key].hasOwnProperty('cache') && collections[key]['cache'].hasOwnProperty('timestamp')) {
                timestamps[key] = collections[key]['cache']['timestamp'];
            }
        }

        if (Object.keys(timestamps).length !== 0) {
            let newest = Object.keys(timestamps).reduce((a, b) => timestamps[a] > timestamps[b] ? a : b);
            thisCollection = collections[newest];
        } else {
            for (let key in collections) {
                if (Object.keys(collections).includes(key) && collections[key] != undefined && !collections[key].hasOwnProperty('error')) {
                    thisCollection = collections[key];
                    for (let model of lsModels) {
                        if (thisCollection.hasOwnProperty(model) && model !== "cache" && model !== "error") {
                            let results = this.checkIpfs(thisCollection[model]);
                            if (results !== null && results !== false) {
                                s3_models[model] = results;
                            }
                        }
                    }            
                    break;        
                }
            }
        }

        for (let model of lsModels) {
            if (thisCollection.hasOwnProperty(model) && model !== "cache" && model !== "error") {
                let results = this.check_ipfs(thisCollection[model]);
                if (results !== null && results !== false) {
                    ipfsModels[model] = results;
                }
            } else {
                for (let key in collections) {
                    if (collections[key].hasOwnProperty(model) && model !== "cache" && model !== "error") {
                        let results = this.check_ipfs(collections[key][model]);
                        if (results !== null && results !== false) {
                            ipfsModels[model] = results;
                        }
                        break;
                    }
                }
            }
        }

        this.ipfsModels = ipfsModels;
        return ipfsModels;
    }

    async state(kwargs = {}) {
        const timestamp = Date.now() / 1000;
        const oneHourAgo = timestamp - 3600;
        const oneDayAgo = timestamp - 86400;
        const tenDaysAgo = timestamp - 8640000;

        try {
            if (fs.existsSync(path.join(this.ipfsPath, "state.json"))) {
                const state_mtime = fs.statSync(path.join(this.ipfsPath, "state.json")).mtime.getTime() / 1000;
                if (state_mtime > oneDayAgo) {
                    this.lastUpdate = state_mtime;
                    this.models = JSON.parse(fs.readFileSync(path.join(this.ipfsPath, "state.json"), 'utf8'));
                    this.lastUpdate = timestamp;
                }
            } else {
                execSync(`touch ${path.join(this.ipfsPath, "state.json")}`);
            }
        } catch (e) {
            this.models = {};
        }
        let src = kwargs.hasOwnProperty("src") ? kwargs["src"] : "all";

        if (src !== "all") {
            if (src === "s3") {
                this.models["s3_models"] = this.lsS3Models();
            } else if (src === "ipfs") {
                this.ipfsPinset = this.ipfsKit.ipfsGetPinset();
                this.models["ipfs_models"] = this.lsIpfsModels();
            } else if (src === "local") {
                this.models["local_models"] = this.lsLocalModels();
            } else if (src === "https") {
                this.models["https_models"] = this.lshttpsModels();
            }
        } else {
            if (this.lastUpdate < tenDaysAgo) {
                this.loadCollection();
                this.models["s3_models"] = this.lsS3Models();
                this.models["ipfs_models"] = this.lsIpfsModels();
                this.models["local_models"] = this.lsLocalModels();
                this.models["https_models"] = this.lshttpsModels();
                this.ipfsPinset = this.ipfsKit.ipfsGetPinset();
                this.lastUpdate = timestamp;
            }
        }
        
        if (this.models.hasOwnProperty("s3Models")) {
            this.models["s3_models"] = this.models["s3Models"];
            delete this.models["s3Models"];
        }
        if (this.models.hasOwnProperty("ipfs_models")) {
            this.models["ipfs_models"] = this.models["ipfs_models"];
            delete this.models["ipfs_models"];
        }
        if (this.models.hasOwnProperty("https_models")) {
            this.models["https_models"] = this.models["https_models"];
            delete this.models["https_models"];
        }
        if (this.models.hasOwnProperty("localModels")) {
            this.models["local_models"] = this.models["localModels"];
            delete this.models["localModels"];
        }
        
        for (let model in this.collection) {
            if (model !== "cache") {
                let thisModel = this.collection[model];
                let cache = thisModel["cache"];
                if (cache.hasOwnProperty("ipfs")) {
                    let ipfs = cache["ipfs"];
                    for (let file in ipfs) {
                        let this_file = ipfs[file];
                        if (this_file.hasOwnProperty("path")) {
                            let path = this_file["path"];
                            if (!this.collectionPins.includes(path)) {
                                if (this.ipfsPinset["ipfs"].hasOwnProperty(path)) {
                                    let pin_type = this.ipfsPinset["ipfs"][path];
                                    if (pin_type !== "indirect") {
                                        this.collectionPins.push(path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        const stringifiedModels = JSON.stringify(this.models);
        const modelsMd5 = crypto.createHash('md5').update(stringifiedModels).digest('hex');
        let stateJsonMd5;

        try {
            const stateJson = JSON.parse(fs.readFileSync(path.join(this.ipfsPath, "state.json"), 'utf8'));
            stateJsonMd5 = crypto.createHash('md5').update(JSON.stringify(stateJson)).digest('hex');
        } catch (e) {
            fs.writeFileSync(path.join(this.ipfsPath, "state.json"), stringifiedModels);
            stateJsonMd5 = crypto.createHash('md5').update(fs.readFileSync(path.join(this.ipfsPath, "state.json"), 'utf8')).digest('hex');
        }

        if (modelsMd5 !== stateJsonMd5) {
            fs.writeFileSync(path.join(this.ipfsPath, "state.json"), stringifiedModels);
        }

        return this.models;
    }

    async evictLocal(model, kwargs = {}) {
        const localModelPath = path.join(this.localPath, model);
        if (fs.existsSync(localModelPath)) {
            rimraf.sync(localModelPath);
        }
        return true;
    }

    async evictS3(model, kwargs = {}) {
        const s3_model_path = this.collection[model]["cache"]["s3"];
        const s3ModelUrl = s3_model_path[0]["url"];
        const s3ModelPathParts = s3ModelUrl.split("/");
        const s3ModelBucket = s3ModelPathParts[2];
        const s3ModelDir = s3ModelPathParts[3];
        const results = await this.s3Kit.deleteObject({
            Bucket: s3ModelBucket,
            Key: s3ModelDir
        }).promise();
        return results;
    }

    async evict_models(kwargs = {}) {
        const lsModels = this.lsModels();
        const history = this.history();
        const currentTimestamp = Date.now() / 1000;
    
        for (const model of lsModels) {
            if (this.models["local_models"].hasOwnProperty(model)) {
                const thisModelTimestamp = this.models["local_models"][model];
                const thisHistoryTimestamp = new Date(history[model]).getTime() / 1000;
                if (currentTimestamp - thisModelTimestamp > this.timing["local_time"] && currentTimestamp - thisHistoryTimestamp > this.timing["local_time"]) {
                    await this.evictLocal(model);
                    delete this.models["local_models"][model];
                }
            } else if (this.models["s3_models"].hasOwnProperty(model)) {
                const thisModelTimestamp = this.models["s3_models"][model];
                const thisHistoryTimestamp = new Date(history[model]).getTime() / 1000;
                if (currentTimestamp - thisModelTimestamp > this.timing["s3_time"] && currentTimestamp - thisHistoryTimestamp > this.timing["s3_time"]) {
                    await this.evictS3(model);
                    delete this.models["s3_models"][model];
                }
            }
        }
    
        for (const model in this.models["local_models"]) {
            if (!lsModels.includes(model)) {
                await this.evictLocal(model);
                delete this.models["local_models"][model];
            }
        }
    
        for (const model in this.models["s3_models"]) {
            if (!lsModels.includes(model)) {
                await this.evictS3(model);
                delete this.models["s3_models"][model];
            }
        }
    
        const results = {
            "s3_models": this.models["s3_models"],
            "ipfs_models": this.models["ipfs_models"],
            "local_models": this.models["local_models"],
            "https_models": this.models["https_models"]
        };
    
        return results;
    }


    async checkHistoryModels(kwargs = {}) {
        const lsModels = this.lsModels();
        const currentTimestamp = Date.now() / 1000;
        const historyJsonPath = path.join(this.ipfsPath, "history.json");
    
        if (Object.keys(this.historyModels).length === 0) {
            if (fs.existsSync(historyJsonPath)) {
                try {
                    this.historyModels = JSON.parse(fs.readFileSync(historyJsonPath, 'utf8'));
                } catch (e) {
                    fs.writeFileSync(historyJsonPath, JSON.stringify({}));
                }
            }
        }
    
        for (const model of lsModels) {
            if (!this.historyModels.hasOwnProperty(model)) {
                this.historyModels[model] = null;
            }
    
            if (this.historyModels[model] !== null) {
                const thisModelTimestamp = new Date(this.history[model]).getTime() / 1000;
                if (currentTimestamp - thisModelTimestamp > 60) {
                    this.historyModels[model] = null;
                }
            }
        }
    
        for (const model in this.historyModels) {
            if (!lsModels.includes(model)) {
                delete this.historyModels[model];
            }
        }
    
        const historyJsonMtime = fs.existsSync(historyJsonPath) ? fs.statSync(historyJsonPath).mtime.getTime() / 1000 : null;
        if (!historyJsonMtime || currentTimestamp - historyJsonMtime > 60) {
            fs.writeFileSync(historyJsonPath, JSON.stringify(this.historyModels));
        }
    
        return this.historyModels;
    }


    async checkZombies(kwargs = {}) {
        const lsModels = this.lsModels();
        const localFiles = fs.readdirSync(this.localPath, { withFileTypes: true });
        const lsLocalFiles = [];
        const collectionFiles = ["collection.json"];
        const zombies = {};
    
        localFiles.forEach(file => {
            if (file.isFile()) {
                let tmpFilename = path.join(this.localPath, file.name);
                tmpFilename = tmpFilename.split(path.sep).slice(3).join(path.sep);
                const splitTmpFilename = tmpFilename.split(path.sep);
                if (splitTmpFilename.length > 1 && !tmpFilename.includes("ipfs") && !tmpFilename.includes("cloudkit")) {
                    lsLocalFiles.push(tmpFilename);
                }
            }
        });
    
        for (const model in this.collection) {
            if (model !== "cache") {
                const thisModel = this.collection[model];
                const thisFolderName = thisModel["id"];
                const thisFolderData = thisModel["folderData"];
                thisFolderData.forEach(file => {
                    collectionFiles.push(thisFolderName + file);
                });
            }
        }
    
        const s3Files = await this.s3Kit.s3LsDir("", this.s3cfg["bucket"]);
        const s3FileNames = s3Files.map(file => file["key"]);
        const ipfsFiles = await this.ipfsKit.ipfsLsPath("/");
        const ipfsFileNames = ipfsFiles["ipfsLsPath"].map(file => file["name"]);
    
        const collectionPins = this.collectionPins;
    
        const compareS3Files = s3FileNames.filter(x => !collectionFiles.includes(x));
        zombies["s3"] = compareS3Files;
        const compareLocalFiles = lsLocalFiles.filter(x => !collectionFiles.includes(x));
        zombies["local"] = compareLocalFiles;
        const compareIpfsFiles = ipfsFileNames.filter(x => !collectionFiles.includes(x));
        zombies["ipfsFiles"] = compareIpfsFiles;
        const compareIpfsPins = collectionPins.filter(x => !this.ipfsPinset.includes(x));
        zombies["ipfs"] = compareIpfsPins;
    
        this.zombies = zombies;
        return zombies;
    }

    async randHistory(kwargs = {}) {
        const history = this.historyModels;
        const twoWeeksAgo = Date.now() / 1000 - 14 * 24 * 60 * 60;
        const twoDaysAgo = Date.now() / 1000 - 2 * 24 * 60 * 60;
        const now = Date.now() / 1000;
    
        for (const model in history) {
            const random_float = Math.random();
            const random_timestamp = ((now - twoWeeksAgo) * random_float) + twoWeeksAgo;
            history[model] = random_timestamp;
        }
    
        this.historyModels = history;
        return history;
    }

    async checkExpired(kwargs = {}) {
        const lsModels = this.lsModels();
        const currentTimestamp = Date.now() / 1000;
        const expired = {
        "local" : [],
        "s3" : [],
        "ipfs": [],
        };
    
        for (const model of lsModels) {
            if ("local_models" in this.models && model in this.models["local_models"]) {
                const thisModelTimestamp = this.models["local_models"][model];
                if (currentTimestamp - thisModelTimestamp > this.timing["local_time"] && currentTimestamp - this.historyModels[model] > this.timing["local_time"]) {
                    expired["local"].push(model);
                }
            }
            if ("s3Models" in this.models && model in this.models["s3Models"]) {
                const thisModelTimestamp = this.models["s3Models"][model];
                if (currentTimestamp - thisModelTimestamp > this.timing["s3_time"] && currentTimestamp - this.historyModels[model] > this.timing["s3_time"]) {
                    expired["s3"].push(model);
                }
            }
            if ("s3_models" in this.models && model in this.models["s3_models"]) {
                const thisModelTimestamp = this.models["s3_models"][model];
                if (currentTimestamp - thisModelTimestamp > this.timing["s3_time"] && currentTimestamp - this.historyModels[model] > this.timing["s3_time"]) {
                    expired["s3"].push(model);
                }
            }
        }
    
        this.expired = expired;
        return this.expired;
    }

    async checkPinnedModels(kwargs = {}) {
        const lsModels = this.lsModels();
        while (Object.keys(this.pinnedModels).length < 5) {
            const randomNumber = Math.random();
            const calculate = Math.round(randomNumber * lsModels.length);
            if (calculate < lsModels.length) {
                const chosenModel = lsModels[calculate];
                this.pinnedModels[chosenModel] = Date.now() / 1000;
            }
        }
        // remove later and get data from orchestrator
        return this.pinned;
    }

    async checkNotFound(kwargs = {}) {
        const lsModels = this.lsModels();
        const notFound = {
            "local" : [],
            "s3" : [],
        };

        for (const model in this.historyModels) {
            const currentTime = Date.now() / 1000;
            const timeDelta = currentTime - this.historyModels[model];
            if (timeDelta < this.timing["local_time"]) {
                if ("local_models" in this.models && !(model in this.models["local_models"])) {
                    notFound["local"].push(model);
                }
                if ("s3_models" in this.models && !(model in this.models["s3_models"])) {
                    notFound["s3"].push(model);
                }
            }
        }
  
        for (const model in this.pinnedModels) {
            if ("local_models" in this.models && !(model in this.models["local_models"])) {
                notFound["local"].push(model);
            }
            if ("s3_models" in this.models && !(model in this.models["s3_models"])) {
                notFound["s3"].push(model);
            }
        }
  
        this.notFound = notFound;
        return this.notFound;
    }

    async downloadMissing(kwargs = {}) {
        const currentTimestamp = Date.now() / 1000;
        const notFound = this.checkNotFound();
        for (const model of notFound["local"]) {
            if (model in this.pinnedModels) {
                this.download_model(model);
                this.models["local_models"][model] = Date.now() / 1000;
            } else if (this.historyModels[model] > currentTimestamp - this.timing["local_time"]) {
                this.download_model(model);
                this.models["local_models"][model] = Date.now() / 1000;
            }
        }
        for (const model of notFound["s3"]) {
            if (model in this.pinnedModels) {
                this.s3Kit.s3UlDir(this.localPath + "/" + model, this.s3cfg["bucket"], this.models["s3_models"][model]["folderData"]);
                this.models["s3_models"][model] = Date.now() / 1000;
            } else if (this.historyModels[model] > currentTimestamp - this.timing["s3_time"]) {
                this.s3Kit.s3UlDir(this.localPath + "/" + model, this.s3cfg["bucket"], this.models["s3_models"][model]["folderData"]);
                this.models["s3_models"][model] = Date.now() / 1000;
            }
        }
        return null;
    }

    async evictExpiredModels(kwargs = {}) {
        const currentTimestamp = Date.now() / 1000;
        const expired = this.expired;
        for (const model of expired["local"]) {
        this.evictLocal(model);
        delete this.models["local_models"][model];
        }
        for (const model of expired["s3"]) {
        this.evictS3(model);
        delete this.models["s3_models"][model];
        }
        return null;
    }
    
    async  evictZombies(kwargs = {}) {
        const zombies = this.zombies;
        for (const file of zombies["local"]) {
            fs.unlinkSync(path.join(this.localPath, file));
        }
        for (const file of zombies["s3"]) {
            this.s3Kit.s3RmFile(file, this.s3cfg["bucket"]);
        }
        return null;
    }

    async test(kwargs = {}) {
        await this.loadCollectionCache();
        await this.state();
        await this.state({src: "s3"});
        await this.state({src: "local"});
        await this.state({src: "ipfs"});
        await this.state({src: "https"});
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
        await this.evictZombies();
        return this;
    }

}

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
    "s3cfg": s3cfg,
    "ipfs_src": ipfs_src,
    "timing": timing,
    "cache": cache,
    "role": role,
    "cluster_name": cluster_name,
    //"ipfs_path": ipfs_path,
    //"localPath": localPath,
    //"ipfs_path": ipfs_path
};

const models_manager = new ModelManager(null, meta);
const results = await models_manager.test();
console.log(results);