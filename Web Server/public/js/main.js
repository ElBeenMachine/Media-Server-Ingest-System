(async() => {
    const jobs = await axios.get("/api/jobs");
    console.log(jobs);
    $('#demo').pagination({
        dataSource: jobs.data,
        callback: function(data, pagination) {
            // template method of yourself
            var tableHeaderRowCount = 1;
            var table = document.getElementById('customers');
            var rowCount = table.rows.length;
            for (var i = tableHeaderRowCount; i < rowCount; i++) {
                table.deleteRow(tableHeaderRowCount);
            }
            populate(data);
        }
    })
})();

function populate(data) {
    // Find a <table> element with id="myTable":
    var table = document.getElementById("customers");

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