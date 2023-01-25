const express = require("express");
module.exports = class WebServer {
    port;
    host;
    app;

    constructor(_port, _host) {
        this.port = _port;
        this.host = _host;
        this.app = express();
        this.app.use("/", require("./router"));

        // Set route properties
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());

        // Set static path
        this.app.use(express.static(__dirname + "/public"));
    }

    listen() {
        this.app.listen(this.port, this.host, () => {
            console.log(`Web server listening at ${this.host}:${this.port}`);
        });
    }
}