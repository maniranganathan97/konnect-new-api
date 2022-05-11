const router = require("express").Router();
const mysql = require('mysql');
const uuid = require('uuid');
const Multer = require('multer');
const path = require('path')
const bodyParser = require('body-parser')
const { format } = require('util')
// var excel = require('excel4node');
const excel = require("exceljs");

const { Storage } = require('@google-cloud/storage')
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // no larger than 5mb, you can change as needed.
    },
})

const gc = new Storage({
    keyFilename: path.join(__dirname, '/keys.json'),
    projectId: 'nodejsapiengine'
})
const bucket = gc.bucket('images-pest')

const pool = mysql.createPool({
    host: '184.168.117.92',
    user: 'userCreation',
    password: 'Vp6f}9)U?u)r',
    database: 'PEST',
    multipleStatements: true,
    dateStrings: true
});

router.get('/test', async(req, res) => {
    let workbook = new excel.Workbook();
let worksheet = workbook.addWorksheet("Tutorials");
worksheet.columns = [
  { header: "S/N", key: "id", width: 5 },
  { header: "Sites", key: "sites", width: 25 },
  { header: "Week", key: "week", width: 25 },
  { header: "Date", key: "date", width: 10 },
  { header: "Pt 1", key: "pt1", width: 10 },
  { header: "Pt 2", key: "pt2", width: 10 },
  { header: "Pt 3", key: "pt3", width: 10 },
  { header: "No. of Missing Points A", key: "missingPoints", width: 10 },
  { header: "No. of Readings Per Month", key: "readingPerMonth", width: 10 },
];
// Add Array Rows
worksheet.addRows([]);
// res is a Stream object
res.setHeader(
  "Content-Type",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
);
res.setHeader(
  "Content-Disposition",
  "attachment; filename=" + "tutorials.xlsx"
);
return workbook.xlsx.write(res).then(function () {
  res.status(200).end();
});
})

module.exports = router;