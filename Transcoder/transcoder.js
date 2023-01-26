const path = require("path");
const fs = require("fs");
const { db } = require("../index");
const config = require("../config");
const ExifTool = require("exiftool-vendored").ExifTool;
const exiftool = new ExifTool({ taskTimeoutMillis: 5000 });

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

module.exports.loadJob = async function(_id) {
    const jobs = await db.query(`SELECT _id, processStatus, ingestPath FROM Jobs WHERE _id = "${_id}" AND processStatus = "QUEUED"`);
    if(jobs.length == 0) return;
    const job = jobs[0];
    if(!await fs.existsSync(job.ingestPath)) throw new Error(`File not found at path ${job.ingestPath}`);
    return job;
}

module.exports.transcode = async function(job) {
    // Function to create the path for the output folder
    async function create_file_output_path(path_name) {
        if(await fs.existsSync(path_name)) return path_name;
        await fs.mkdirSync(path_name, { recursive: true });
        return path_name;
    }
    
    // Function to write the file
    async function write_file(file_path, buffer) {
        // Write file and if fails, retry with a renamed file
        try {
            // Attempt to write the file
            await fs.promises.writeFile(file_path, buffer, { flag: "wx" });
            
            // Get the resolved path of the outputted file
            let resolvedPath = path.resolve(file_path);

            // Inform the console that the file has been processed
            console.log("[File Processed] " + resolvedPath);

            // Add the file output to the parent array to be returned
            output.push(resolvedPath);

            // Return the path for referencing later on
            return resolvedPath;
        } catch (e) {
            // If there was an error (likely duplicate file but I need to handle this more specifically) inform the console that the file exists
            console.log("[File Exists] '" + file_path + "' already exists, making a copy");
                
            // Add '(Copy)' to the end of the file name
            file_path = `${file_path.split(path.extname(path.basename(file_path)))[0]} (Copy)${path.extname(path.basename(file_path))}`;

            // Call 'write_file()' again to try and write the file once more
            await write_file(file_path, buffer);
        }
    }
    
    // Function to delete the file
    async function delete_file(file_path, _id) {
        await fs.unlinkSync(file_path);
        await db.query(`UPDATE Jobs SET processStatus = "DONE", endTime = "${Date.now()}", ingestPath = "null" WHERE _id = "${_id}";`);
        const dir = path.resolve(path.dirname(file_path));
        
        // If the directory is the ingest folder, do nothing
        if(dir == transcoder.getIngestDir()) return;
    
        if(is_empty(dir)) {
            await fs.rmdirSync(dir);
            console.log("[Deleted] Folder " + dir + " has been deleted")
        }
    }
    
    // Function to check if a directory is empty
    function is_empty(file_path) {
        return fs.readdirSync(file_path).length === 0;
    }

    // Array to store the output file path(s)
    let output = [];

    // Define path variables
    const e_path = job.ingestPath;
    const ingest_file_path = path.resolve(e_path).replaceAll(`\\`, `\/`);
    const filename = path.basename(e_path);
    const extension = filename.split(".").filter(Boolean).slice(1)[0];
    const name = filename.split(".").filter(Boolean).slice(0, 1)[0];
    
    const _id = job._id;

    // Log that the queue is being processed
    await db.query(`UPDATE Jobs SET processStatus = "PROCESSING" startTime = "${Date.now()}" WHERE _id = "${_id}";`)

    // Define the output path
    const relative_path = path.resolve(e_path).split(transcoder.getIngestDir()).slice(1)[0];
    const relative_directory = path.resolve(path.dirname(e_path)).split(transcoder.getIngestDir()).slice(1)[0];

    // Check to see if there are any existing rules
    const rule_check = transcoder.getRules().filter(x => { return x.extension.toUpperCase() == extension.toUpperCase()})[0];

    // Execute the rule if there is one
    if(rule_check) {
        console.log("[Rule Applied] " + `${name}.${rule_check.extension} => ${name}.${rule_check.convert}`);
        const output_format = rule_check.convert.toUpperCase();
        const input_format = rule_check.extension.toUpperCase();

        const original_output_path = path.resolve(`${transcoder.getOutputDir()}/${relative_directory}/${input_format}`);
        const convert_output_path = path.resolve(`${transcoder.getOutputDir()}/${relative_directory}/${output_format}`);

        const original_output_file = `${filename}`;
        const convert_output_file = `${name}.${output_format}`;
        
        await create_file_output_path(original_output_path);
        await create_file_output_path(convert_output_path);

        let output_buffer;
        switch (input_format) {
            case "CR2":
                output_buffer = await exiftool.extractBinaryTagToBuffer("PreviewImage", ingest_file_path);
                break;

            case "CR3":
                output_buffer = await exiftool.extractBinaryTagToBuffer("JpgFromRaw", ingest_file_path);
                break;
        
            default:
                output_buffer = await fs.readFileSync(ingest_file_path);
                break;
        }

        await write_file(`${convert_output_path}/${convert_output_file}`, output_buffer);
        await write_file(`${original_output_path}/${original_output_file}`, await fs.readFileSync(ingest_file_path));
        await delete_file(ingest_file_path, _id);
    } else {
        const output_buffer = await fs.readFileSync(ingest_file_path);
        const output_path = path.resolve(transcoder.getOutputDir() + relative_path);
        const output_directory = path.resolve(`${transcoder.getOutputDir()}/${relative_directory}`);
        
        await create_file_output_path(output_directory);
        await write_file(output_path, output_buffer);
        await delete_file(ingest_file_path, _id);
    }

    return output;
}