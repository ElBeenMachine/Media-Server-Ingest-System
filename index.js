require("dotenv").config();
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const config = require("./config");
const ExifTool = require("exiftool-vendored").ExifTool;
const exiftool = new ExifTool({ taskTimeoutMillis: 5000 });


let ingest_folder;
let output_folder;

// Load Ingest Folder
try {
    ingest_folder = path.resolve(config.ingest_folder);
} catch (e) {
    console.error(e);
    console.error("Unable to load the ingest folder. Please make sure the 'TRANSCODE_INGEST_FOLDER' environment variable is set.");
    process.exit(1);
}

// Load Output Folder
try {
    output_folder = path.resolve(config.output_folder);
} catch (e) {
    console.error(e);
    console.error("Unable to load the ingest folder. Please make sure the 'TRANSCODE_OUTPUT_FOLDER' environment variable is set.");
    process.exit(1);
}

// Define Conversion Rules
const rules = [
    {
        extension: "CR2",
        convert: "JPG"
    },
    {
        extension: "CR3",
        convert: "JPG"
    }
];

(() => {
    var watcher = chokidar.watch(ingest_folder, {
        persistent: true,
        followSymlinks: false,
        usePolling: true,
        depth: undefined,
        interval: 100,
        ignorePermissionErrors: false
    });

    watcher.on('add', async function(e_path) {
        console.log('[File Added]', e_path, 'has been added to the ingest queue');
        fs.stat(e_path, async function (err, stat) {
            // Replace error checking with something appropriate for your app.
            if (err) throw err;
            setTimeout(await checkEnd, 5000, e_path, stat);
        });
    });

    console.log("Listening For Changes");
    console.log("Ingest Folder: " + ingest_folder);
    console.log("Output Folder: " + output_folder);
    console.log("Email Updates: " + config.send_notification)
})();

async function checkEnd(e_path, prev) {
    fs.stat(e_path, async function (err, stat) {
        // Replace error checking with something appropriate for your app.
        if (err) throw err;
        if (stat.mtime.getTime() === prev.mtime.getTime()) {
            console.log("[Copy Finished] Initiating transcoding of file " + e_path);
            await process_change(e_path)
        }
        else
            setTimeout(await checkEnd, 5000, e_path, stat);
    });
}

async function process_change(e_path) {
    const ingest_file_path = e_path;
    const dirname = path.dirname(e_path);
    const filename = path.basename(ingest_file_path);
    const extension = filename.split(".").filter(Boolean).slice(1)[0];
    const name = filename.split(".").filter(Boolean).slice(0, 1)[0];

    // Log that a new file has been detected
    console.log("[New File Detected] " + ingest_file_path);

    // Define the output path
    const relative_path = ingest_file_path.split(ingest_folder).slice(1)[0];
    const relative_directory = dirname.split(ingest_folder).slice(1)[0];

    // Check to see if there are any existing rules
    const rule_check = rules.filter(x => { return x.extension.toUpperCase() == extension.toUpperCase()})[0];

    // Execute the rule if there is one
    if(rule_check) {
        console.log("[Rule Applied] " + `${name}.${rule_check.extension} => ${name}.${rule_check.convert}`);
        const output_format = rule_check.convert.toUpperCase();
        const input_format = rule_check.extension.toUpperCase();
        const original_output_path = path.resolve(`${output_folder}/${relative_directory}/${input_format}`);
        const convert_output_path = path.resolve(`${output_folder}/${relative_directory}/${output_format}`);

        const original_output_file = `${filename}`;
        const convert_output_file = `${name}.${output_format}`;
        
        await create_file_output_path(original_output_path);
        await create_file_output_path(convert_output_path);

        let output_buffer;
        switch (input_format) {
            case "CR2":
                output_buffer = await exiftool.extractBinaryTagToBuffer("PreviewImage", e_path);
                break;

            case "CR3":
                output_buffer = await exiftool.extractBinaryTagToBuffer("PreviewImage", e_path);
                break;
        
            default:
                output_buffer = await fs.readFileSync(ingest_file_path);
                break;
        }

        await write_file(`${convert_output_path}/${convert_output_file}`, output_buffer);
        await write_file(`${original_output_path}/${original_output_file}`, output_buffer);
        await delete_file(ingest_file_path);
    } else {
        const output_buffer = await fs.readFileSync(ingest_file_path);
        const output_path = path.resolve(output_folder + relative_path);
        const output_directory = path.resolve(`${output_folder}/${relative_directory}`);
        
        await create_file_output_path(output_directory);
        await write_file(output_path, output_buffer);
        await delete_file(ingest_file_path);
    }
}

async function create_file_output_path(path_name) {
    if(await fs.existsSync(path_name)) return path_name;
    await fs.mkdirSync(path_name, { recursive: true });
    return path_name;
}

async function get_cr2_buffer(file_path) {
    return CR2(file_path);
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

async function delete_file(file_path) {
    await fs.unlinkSync(file_path);
    console.log("[Deleted] File " + file_path + " has been deleted")

    const dir = path.dirname(file_path);
    
    // If the directory is the ingest folder, do nothing
    if(dir == ingest_folder) return await process_notification();

    if(is_empty(dir)) {
        await fs.rmdirSync(dir);
        console.log("[Deleted] Folder " + dir + " has been deleted")
    }
}

function is_empty(file_path) {
    return fs.readdirSync(file_path).length === 0;
}

async function process_notification() {

}