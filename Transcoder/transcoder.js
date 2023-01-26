const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");
const { db } = require("../index");
const config = require("../config");
const ExifTool = require("exiftool-vendored").ExifTool;
const exiftool = new ExifTool({ taskTimeoutMillis: 5000 });
const crypto = require("crypto");

class Transcoder {
    #ingest_dir;
    #output_dir
    #rules;

    constructor(_ingest_dir, _output_dir, _rules) {
        this.#ingest_dir = _ingest_dir;
        this.#output_dir = _output_dir;
        this.#rules = _rules;
    }

    getIngestDir() {
        return path.resolve(this.#ingest_dir);
    }

    getOutputDir() {
        return path.resolve(this.#output_dir);
    }

    getRules() {
        return this.#rules;
    }
}

const transcoder = new Transcoder(config.ingest_dir, config.output_dir, config.rules);

async function loadJob(_id) {
    const jobs = await db.query(`SELECT _id, processStatus`);
    if(jobs.length == 0) return;
    const job = jobs[0];
    console.log(job);
}

module.exports.transcode = async function(e_path) {
    
    // const ingest_file_path = path.resolve(e_path).replaceAll(`\\`, `\/`);
    // const filename = path.basename(e_path);
    // const extension = filename.split(".").filter(Boolean).slice(1)[0];
    // const name = filename.split(".").filter(Boolean).slice(0, 1)[0];
    // const _exists = await db.query(`
    //     SELECT * FROM Jobs where ingestPath = "${ingest_file_path}"
    // `);
    
    // let _id;
    // if(_exists.length == 0) {
    //     _id = crypto.randomUUID();
    //     await db.query(`INSERT INTO Jobs (_id, fileName, ingestPath, processStatus, startTime) VALUES ("${_id}", "${path.basename(ingest_file_path)}", "${ingest_file_path}", "PROCESSING", "${Date.now()}");`)
    // } else {
    //     _id = _exists[0]._id;
    // }
    
    // // Define the output path
    // const relative_path = path.resolve(e_path).split(transcoder.getIngestDir()).slice(1)[0];
    // const relative_directory = path.dirname(e_path).split(transcoder.getIngestDir()).slice(1)[0];

    // // Check to see if there are any existing rules
    // const rule_check = transcoder.getRules().filter(x => { return x.extension.toUpperCase() == extension.toUpperCase()})[0];

    //  // Execute the rule if there is one
    //  if(rule_check) {
    //     console.log("[Rule Applied] " + `${name}.${rule_check.extension} => ${name}.${rule_check.convert}`);
    //     const output_format = rule_check.convert.toUpperCase();
    //     const input_format = rule_check.extension.toUpperCase();

    //     const original_output_path = path.resolve(`${transcoder.getOutputDir()}/${relative_directory}/${input_format}`);
    //     const convert_output_path = path.resolve(`${transcoder.getOutputDir()}/${relative_directory}/${output_format}`);

    //     const original_output_file = `${filename}`;
    //     const convert_output_file = `${name}.${output_format}`;
        
    //     await create_file_output_path(original_output_path);
    //     await create_file_output_path(convert_output_path);

    //     let output_buffer;
    //     switch (input_format) {
    //         case "CR2":
    //             output_buffer = await exiftool.extractBinaryTagToBuffer("PreviewImage", ingest_file_path);
    //             break;

    //         case "CR3":
    //             output_buffer = await exiftool.extractBinaryTagToBuffer("JpgFromRaw", ingest_file_path);
    //             break;
        
    //         default:
    //             output_buffer = await fs.readFileSync(ingest_file_path);
    //             break;
    //     }

    //     await write_file(`${convert_output_path}/${convert_output_file}`, output_buffer);
    //     await write_file(`${original_output_path}/${original_output_file}`, await fs.readFileSync(ingest_file_path));
    //     await delete_file(ingest_file_path, _id);
    // } else {
    //     const output_buffer = await fs.readFileSync(ingest_file_path);
    //     const output_path = path.resolve(transcoder.getOutputDir() + relative_path);
    //     const output_directory = path.resolve(`${transcoder.getOutputDir()}/${relative_directory}`);
        
    //     await create_file_output_path(output_directory);
    //     await write_file(output_path, output_buffer);
    //     await delete_file(ingest_file_path, _id);
    // }
}

async function create_file_output_path(path_name) {
    if(await fs.existsSync(path_name)) return path_name;
    await fs.mkdirSync(path_name, { recursive: true });
    return path_name;
}

async function write_file(file_path, buffer) {
    // Write file and if fails, retry with a renamed file
    await fs.writeFile(file_path, buffer, { flag: "wx" }, function(err) {
        if (err) {
          console.log("[File Exists] '" + file_path + "' already exists, making a copy");
          file_path = `${file_path.split(path.extname(path.basename(file_path)))[0]} (Copy)${path.extname(path.basename(file_path))}`;
          write_file(file_path, buffer);
        }
        else {
          console.log("[File Processed] " + file_path);
        }
    });
    return file_path;
}

async function delete_file(file_path, _id) {
    await fs.unlinkSync(file_path);
    await db.query(`UPDATE Jobs SET processStatus = "DONE", endTime = "${Date.now()}", ingestPath = "null" WHERE _id = "${_id}";`);
    const dir = path.resolve(file_path.substring(0,file_path.lastIndexOf("\\")+1));
    
    // If the directory is the ingest folder, do nothing
    if(dir == transcoder.getIngestDir()) return await process_notification();

    if(is_empty(dir)) {
        await fs.rmdirSync(dir);
        console.log("[Deleted] Folder " + dir + " has been deleted")
    }
}

function is_empty(file_path) {
    return fs.readdirSync(file_path).length === 0;
}