const router = require("express").Router();
const { db } = require("../../index");
const config = require("../../config");

router.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

router.get("/api/jobs", async (req, res) => {
    const jobs = await db.query("SELECT * FROM Jobs ORDER BY startTime DESC");
    res.json(jobs);
});

module.exports = router;