import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';


export class TestFio {
    constructor(resources, meta = null) {
        this.thisDir = path.dirname(import.meta.url);
        if (this.thisDir.startsWith("file://")) {
            this.thisDir = this.thisDir.replace("file://", "");
        }
        this.path = process.env.PATH;
        this.path = this.path + ":" + path.join(this.thisDir, "bin")
        this.pathString = "PATH="+ this.path
    }

    call(method, kwargs = {}) {
        if (method === "test") {
            return this.test(kwargs);
        }
    }

    diskDeviceNameFromLocation(location) {
        let directory_tree = location.split("/");

        const command = "df -h";
        let df = execSync(command).toString();
        df = df.split("\n");
        for (let line of df) {
            if (line.includes(location)) {
                const device = line.split(" ")[0];
                return device;
            } else {
                while (directory_tree.length > 1) {
                    directory_tree.pop();
                    location = directory_tree.join("/");
                    for (let line of df) {
                        if (directory_tree.length === 1 && location === "") {
                            location = "/";
                        }
                        if (line.includes(location)) {
                            while (line.includes("  ")) {
                                line = line.replace("  ", " ");
                            }
                            const mount = line.split(" ");
                            if (mount[5] === location) {
                                const device = mount[0];
                                return device;
                            }
                        }
                    }
                }
            }
        }
        return "rootfs";
    }


    diskDeviceTotalCapacity(device) {
        const command = "df -h";
        let df = execSync(command).toString();
        df = df.split("\n");
        for (let line of df) {
            if (line.includes(device)) {
                while (line.includes("  ")) {
                    line = line.replace("  ", " ");
                }
                const capacity = line.split(" ")[1];
                return capacity;
            }
        }
        return null;
    }

    diskDeviceUsedCapacity(device) {
        const command = "df -h";
        let df = execSync(command).toString();
        df = df.split("\n");
        for (let line of df) {
            if (line.includes(device)) {
                while (line.includes("  ")) {
                    line = line.replace("  ", " ");
                }
                const capacity = line.split(" ")[2];
                return capacity;
            }
        }
        return null;
    }

    diskDeviceAvailCapacity(device) {
        const command = "df -h";
        let df = execSync(command).toString();
        df = df.split("\n");
        for (let line of df) {
            if (line.includes(device)) {
                while (line.includes("  ")) {
                    line = line.replace("  ", " ");
                }
                const capacity = line.split(" ")[3];
                return capacity;
            }
        }
        return null;
    }

    diskSpeed4k(location) {
        const tempFile = tmp.fileSync({ postfix: '.iso', dir: location });
        const timestamp_0 = Date.now();
        const command = `dd if=/dev/zero of=${tempFile.name} bs=4k count=8k conv=fdatasync`;
        execSync(command);
        const timestamp_1 = Date.now();
        const write_speed = 32 / ((timestamp_1 - timestamp_0) / 1000);
        const command2 = `dd if=${tempFile.name} of=/dev/null bs=4k`;
        execSync(command2);
        const timestamp_2 = Date.now();
        const read_speed = 32 / ((timestamp_2 - timestamp_1) / 1000);
        fs.unlinkSync(tempFile.name);
        return { read_speed, write_speed };
    }


    stats(location, kwargs = {}) {
        const disk_device = this.diskDeviceNameFromLocation(location);
        const disk_capacity = this.diskDeviceTotalCapacity(disk_device);
        const disk_used = this.diskDeviceUsedCapacity(disk_device);
        const disk_avail = this.diskDeviceAvailCapacity(disk_device);
        const { read_speed: disk_read_speed, write_speed: disk_write_speed } = this.diskSpeed4k(location);
        const results = {
            disk_device,
            disk_capacity,
            disk_used,
            disk_avail,
            disk_write_speed,
            disk_read_speed
        };
        return results;
    }


}

function test(){
    const thisTest = new TestFio(null);
    const results = thisTest.test("/tmp/");
    console.log(results);
    console.log("Test complete");
    //process.exit(0);
}