// Import necessary modules
require("dotenv").config();
const config = require("./config");

// Set up database
const Database = require("./handlers/db");
const db = new Database(config.db);

module.exports.db = db;

(async() => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS Jobs (
            _id VARCHAR(255) DEFAULT (uuid()) PRIMARY KEY, 
            fileName VARCHAR(255) NOT NULL, 
            filePath VARCHAR(255) NOT NULL, 
            processStatus varchar(50) NOT NULL, 
            startTime varchar(255) NOT NULL, 
            endTime varchar(255)
        );
    `);
})();

// Set up transcoder
require("./Transcoder").watcher.listen();
require("./Web Server").listen();