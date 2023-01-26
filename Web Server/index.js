const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const ts = require("../Transcoder/transcoder");
const config = require("../config")

class WebServer {
    port;
    host;
    app;

    constructor(_port, _host) {
        this.port = _port;
        this.host = _host;
        this.app = express();

        // Set route properties
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());

        // Set static path
        this.app.use(express.static(__dirname + "/public"));

        this.app.use("/", require("./router"));
    }

    listen() {
        const server = http.createServer(this.app);
        const wss = new WebSocket.Server({ server });
        wss.on('connection', (ws) => {

            // connection is up, let's add a simple simple event
            ws.on('message', async (message) => {
                const data = JSON.parse(message);

                if(data.type === "TRANSCODE") {
                    console.log(data._ids);

                    for(let _id of data._ids) {
                        let job;
                        try {
                            job = await ts.loadJob(_id);
                        } catch(e) {
                            await db.query(`UPDATE Jobs SET processStatus = "ERROR", endTime = "${Date.now()}" WHERE _id = "${_id}";`);
                        }
                    
                        if(!job) {
                            failures.push(_id);
                            continue;
                        }
                    
                        let transcode;
                        try {
                            transcode = await ts.transcode(job);
                            ws.send(JSON.stringify({ type: "TRANSCODE_RESPONSE", status: "success", _id }));
                        } catch (e) {
                            ws.send(JSON.stringify({ type: "TRANSCODE_RESPONSE", status: "failure", _id }));
                            continue;
                        }
                    }
                }
            });
        });

        server.listen(this.port, () => {
            console.log(`Server started on port ${server.address().port} :)`);
        });
    }
}

module.exports.listen = function() {
    // Start Web Server
    if(config.web_server) {
        const server = new WebServer(config.web_server_port, config.web_server_host);
        server.listen();
    }
}