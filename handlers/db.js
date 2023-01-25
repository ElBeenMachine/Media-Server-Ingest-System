const mysql = require("mariadb");

module.exports = class Database {
    #options;
    #conn;
    constructor(options) {
        this.#options = options;
    }

    async query(str) {
        if(!this.#conn) this.#conn = await mysql.createConnection(this.#options);
        try {
            // Use Connection to get contacts data
            var rows = await this.#conn.query(str);
            return rows;
        } catch (err) {
            // Manage Errors
            throw err;
        } finally {
            // Close Connection
            // if (conn) conn.end();
        }
    }
}