// Import necessary modules
require("dotenv").config();
const config = require("./config");
const WebServer = require("./Web Server");

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
require("./Transcoder").listen();

// Start Web Server
if(config.web_server) {
    const server = new WebServer(config.web_server_port, config.web_server_host);
    server.listen();
}