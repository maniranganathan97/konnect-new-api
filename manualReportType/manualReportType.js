const router = require("express").Router();
const mysql = require('mysql');

var databaseConnectionPool = require('../databaseConnection/databaseConnectionPool');
const pool =databaseConnectionPool;

router.get('/getAll', async (req, res) => {
    let query = `select * from ManualReportType`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No ManualReportType data available." })
        }

    })
});

module.exports = router;