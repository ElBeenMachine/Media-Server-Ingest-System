let failures = [];
let successes = [];

var socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`);
socket.onopen = function(event) {
    console.log("Websocket Connection Established");

    socket.onmessage = function(msg) {
        const message = JSON.parse(msg.data);
        switch (message.type) {
            case "TRANSCODE_RESPONSE":
                document.getElementById(`queue-${message._id}`).remove();
                loadAll();
                loadErrors();
                break;
            case "STATUS":
                if(message.processing == true) {
                    console.log("Server is currently busy.");
                    document.body.innerHTML = "Server is Currently Processinsg. Please try again later.";
                }
                break;
        }
    }
};

async function loadQueue() {
    const jobs = await axios.get("/api/jobs/queue");
    const queue = jobs.data.map(x => x._id);

    var tableHeaderRowCount = 1;
    var table = document.getElementById('queue');
    var rowCount = table.rows.length;
    for (var i = tableHeaderRowCount; i < rowCount; i++) {
        table.deleteRow(tableHeaderRowCount);
    }

    populateQueue("queue", jobs.data);
    
    $("#transcode").click(async(e) => {
        socket.send(JSON.stringify({ type: "TRANSCODE", _ids: queue}));
    });
};

async function loadErrors() {
    const jobs = await axios.get("/api/jobs/errors");
    $('#errorsList').pagination({
        dataSource: jobs.data,
        callback: function(data, pagination) {
            // template method of yourself
            var tableHeaderRowCount = 1;
            var table = document.getElementById('errors');
            var rowCount = table.rows.length;
            for (var i = tableHeaderRowCount; i < rowCount; i++) {
                table.deleteRow(tableHeaderRowCount);
            }
            populate("errors", data);
        }
    });
};

async function loadAll() {
    const jobs = await axios.get("/api/jobs");
    $('#allList').pagination({
        dataSource: jobs.data,
        callback: function(data, pagination) {
            // template method of yourself
            var tableHeaderRowCount = 1;
            var table = document.getElementById('all');
            var rowCount = table.rows.length;
            for (var i = tableHeaderRowCount; i < rowCount; i++) {
                table.deleteRow(tableHeaderRowCount);
            }
            populate("all", data);
        }
    });
};

function populateQueue(name, data) {
    // Find a <table> element with id="myTable":
    var table = document.getElementById(name);

    $.each(data, function(index, item) {
        // Create an empty <tr> element and add it to the 1st position of the table:
        var row = table.insertRow(-1);
        row.id = `${name}-${item._id}`;
    
        // Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
        const _id = row.insertCell(0);
        const _fileName = row.insertCell(1);
        const _status = row.insertCell(2);
    
        // Add some text to the new cells:
        _id.innerHTML = item._id;
        _fileName.innerHTML = item.fileName;
        _status.innerHTML = item.processStatus;
    });
}

function populate(name, data) {
    // Find a <table> element with id="myTable":
    var table = document.getElementById(name);

    data.sort(function(a,b){
        // Turn your strings into dates, and then subtract them
        // to get a value that is either negative, positive, or zero.
        return new Date(parseInt(b.startTime)) - new Date(parseInt(a.startTime));
    });

    $.each(data, function(index, item) {
        const startTime = moment(parseInt(item.startTime));
        const endTime = moment(parseInt(item.endTime));
        const timeTaken = moment(endTime.diff(startTime)).format("m[m] s[s]");

        // Create an empty <tr> element and add it to the 1st position of the table:
        var row = table.insertRow(-1);
        row.id = `${name}-${item._id}`;
    
        // Insert new cells (<td> elements) at the 1st and 2nd position of the "new" <tr> element:
        const _date = row.insertCell(0);
        const _id = row.insertCell(1);
        const _fileName = row.insertCell(2);
        const _status = row.insertCell(3);
        const _timeTaken = row.insertCell(4);
    
        // Add some text to the new cells:
        _date.innerHTML = `${startTime.format("DD/MM/YYYY")} at ${startTime.format("HH:mm:ss")}`;
        _id.innerHTML = item._id;
        _fileName.innerHTML = item.fileName;
        _status.innerHTML = item.processStatus;
        _timeTaken.innerHTML = timeTaken;
    });
}

loadQueue();
loadAll();
loadErrors();