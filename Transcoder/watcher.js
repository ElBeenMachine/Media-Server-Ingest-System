const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");
const { db } = require("../index");
const config = require("../config");
const crypto = require("crypto");

class Watcher {
    #ingest_dir;

    constructor(_ingest_dir, _output_dir, _rules) {
        this.#ingest_dir = _ingest_dir;
    }

    getIngestDir() {
        return path.resolve(this.#ingest_dir);
    }

    async queue(e_path) {
        const ingest_file_path = path.resolve(e_path).replaceAll(`\\`, `\/`);
        const _exists = await db.query(`
            SELECT * FROM Jobs where ingestPath = "${ingest_file_path}"
        `);
        
        let _id;
        if(_exists.length == 0) {
            _id = crypto.randomUUID();
            await db.query(`INSERT INTO Jobs (_id, fileName, ingestPath, processStatus, startTime) VALUES ("${_id}", "${path.basename(ingest_file_path)}", "${ingest_file_path}", "QUEUED", "${Date.now()}");`);
            console.log(`[Job Queued] Job with id ${_id} has been added to the queue`);
        } else {
            _id = _exists[0]._id;
            console.log(`[Already Queued] Job with id ${_id} has already been added to the queue`);
        }

    }
}

const watcher = new Watcher(config.ingest_dir, config.output_dir, config.rules);

module.exports.listen = () => {
    const watch = chokidar.watch(watcher.getIngestDir(), {
        persistent: true,
        followSymlinks: false,
        usePolling: true,
        depth: undefined,
        interval: 100,
        ignorePermissionErrors: false
    });

    watch.on("add", async (e_path) => {
        fs.stat(e_path, async (err, stat) => {
            if(err) throw err;
            setTimeout(await checkEnd, 5000, e_path, stat);
        });
    });
}

// Function to check if the whole file has been copied yet. 
async function checkEnd(e_path, prev) {
    fs.stat(e_path, async function (err, stat) {
        // Replace error checking with something appropriate for your app.
        if (err) throw err;
        if (stat.mtime.getTime() === prev.mtime.getTime()) {
            await watcher.queue(e_path);
        }
        else
            setTimeout(await checkEnd, 5000, e_path, stat);
    });
}