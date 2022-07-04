const router = require("express").Router();
const mysql = require('mysql');
const uuid = require('uuid');
const Multer = require('multer');
const path = require('path')
const bodyParser = require('body-parser')
const { format } = require('util')

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

var databaseConnectionPool = require('./databaseConnection/databaseConnectionPool');
const pool =databaseConnectionPool;


router.post('/UpdateADCReportSign', async(req, res) => {
    var authPromise = authPromisePost(req);
    Promise.all([authPromise]).then(data => {
        return res.status(200).json({
            code: 200,
            message: "Data inserted sucessfully to the table AuthorizeStatusReports",
          });
    }).catch(err => {
        console.log(err);
        return res.status(400).json({
            code: 400,
            message: "Data inserted failed to the table AuthorizeStatusReports",
          });
    })

});

function authPromisePost(req) {
    return new Promise((resolve, reject) => {
        const buffer = Buffer.from(req.body["SignatureURL"], "base64");
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("SignatureURL-" + id + ".jpg");
        const blobStream = blob.createWriteStream();
    
        blobStream.on("error", (err) => {
          next(err);
        });
    
        blobStream.on("finish", () => {
          // The public URL can be used to directly access the file via HTTP.
          const publicUrl = format(
            `https://storage.googleapis.com/${bucket.name}/${blob.name}`
          );
    
          var inseryQuery = `insert into AuthorizeStatusReports(
            AuthStatusID			 
                ,StatusReportType
                ,AcknowledgedBy
                ,SignatureImageUrl
                ,StatusMonthAndYear
                ,ReportedDateTime
            ) values (?,?,?,?,?,?)`;
          let parameters = [
            "",
            req.body.StatusReportType,
            req.body.AcknowledgedBy,
            publicUrl,
            req.body.StatusMonthAndYear,
            req.body.ReportedDateTime
          ];
    
          pool.query(inseryQuery, parameters, (err, results) => {
            if (err) throw err;
            if (results.affectedRows > 0) {
              resolve(results);
            } else {
              reject("Insert into AuthorizeStatusReports failed");
            }
          });
        });
        blobStream.end(buffer);
      });
}

module.exports = router;