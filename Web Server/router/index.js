const router = require("express").Router();
const { db } = require("../../index");

router.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

router.get("/api/jobs/queue", async (req, res) => {
    const jobs = await db.query("SELECT * FROM Jobs WHERE processStatus = 'QUEUED' ORDER BY startTime DESC");
    res.json(jobs);
});

router.get("/api/jobs/errors", async (req, res) => {
    const jobs = await db.query("SELECT * FROM Jobs WHERE processStatus = 'ERROR' ORDER BY startTime DESC");
    res.json(jobs);
});

router.get("/api/jobs", async (req, res) => {
    const jobs = await db.query("SELECT * FROM Jobs ORDER BY startTime DESC");
    res.json(jobs);
});

module.exports = router;