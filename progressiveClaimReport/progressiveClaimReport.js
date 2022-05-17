const router = require("express").Router();
const mysql = require('mysql');
const uuid = require('uuid');
const Multer = require('multer');
const path = require('path')
const bodyParser = require('body-parser')
const { format } = require('util')
// var excel = require('excel4node');
const excel = require("exceljs");

const { Storage } = require('@google-cloud/storage');
const { resolve } = require("path");
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // no larger than 5mb, you can change as needed.
    },
})

const gc = new Storage({
    keyFilename: path.join(__dirname, '../keys.json'),
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


router.post('/save', async(req, res) => {

    var savePromise = saveProgressiveClaimReportData(req);
    Promise.all([savePromise]).then((data) => {
        return res.status(200).json({
            code: 200,
            message: "Data inserted sucessfully to the table ProgressiveClaimReport",
          });
    }).catch(err => {
        console.log(err);
        return res.status(400).json({
            code: 400,
            message: "Data inserted failed to the table ProgressiveClaimReport",
          });
    })
});

function saveProgressiveClaimReportData(req) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(req.body["ProgressiveReportFile"], "base64");
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    const blob = bucket.file("ProgressiveReportFile" + id + ".pdf");
    const blobStream = blob.createWriteStream();

    blobStream.on("error", (err) => {
      next(err);
    });

    blobStream.on("finish", () => {
      // The public URL can be used to directly access the file via HTTP.
      const publicUrl = format(
        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
      );

      var inseryQuery = `insert into ProgressiveClaimReport(
        ProgressiveClaimReportID			 
            ,ReportedDate
            ,CreatedBy
            ,FileURL
            
        ) values (?,?,?,?)`;
      let parameters = [
        "",
        req.body.ReportedDate,
        req.body.CreatedBy,
        publicUrl
      ];

      pool.query(inseryQuery, parameters, (err, results) => {
        if (err) throw err;
        if (results.affectedRows > 0) {
          resolve(results);
        } else {
          reject("Insert into ProgressiveClaimReport failed");
        }
      });
    });
    blobStream.end(buffer);
  });
}

router.get('/get', async(req, res) => {
    var getPromise = getProgressiveClaimReportData(req);
    Promise.all([getPromise])
    .then(allData => {
       
        return res.status(200).json(allData[0]);
    })
    .catch(err => {
        
        return res.status(400).json({
            code: 400,
            message: "Getting ProgressiveClaimReport data failed",
          });
    })
})
router.get('/getAll', async(req, res) => {
    var getPromise = getProgressiveClaimReportAllData(req);
    Promise.all([getPromise])
    .then(allData => {
       
        return res.status(200).json(allData[0]);
    })
    .catch(err => {
        
        return res.status(400).json({
            code: 400,
            message: "Getting ProgressiveClaimReport data failed",
          });
    })
})

function getProgressiveClaimReportAllData(req) {
    return new Promise((resolve, reject) => {
        let getQuery = `select * from ProgressiveClaimReport 
        `;
        pool.query(getQuery, function (err, result) {
          if (err) throw err;
          if (result.length > 0) {
            resolve(result);
          } else {
            resolve(result);
          }
        });
    })
}
function getProgressiveClaimReportData(req) {
    return new Promise((resolve, reject) => {
        let getQuery = `select * from ProgressiveClaimReport where ProgressiveClaimReportID=  ${req.query.ProgressiveClaimReportID}
        `;
        pool.query(getQuery, function (err, result) {
          if (err) throw err;
          if (result.length > 0) {
            resolve(result);
          } else {
            resolve(result);
          }
        });
    })
}


router.put('/update', async(req, res) => {

    var updatePromise = updateProgressiveClaimReportData(req);
    Promise.all([updatePromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ProgressiveClaimReport updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the ProgressiveClaimReport -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table ProgressiveClaimReport failed",
          });
    })
})


function updateProgressiveClaimReportData(req) {
    return new Promise((resolve, reject) => {
      let detail = req.body;
      let query =
        `Update ProgressiveClaimReport SET  ` +
        Object.keys(detail)
          .map((key) => `${key}=?`)
          .join(",") +
        " where ProgressiveClaimReportID = ?";
      const parameters = [...Object.values(detail), req.query.ProgressiveClaimReport];
      pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err;
  
        if (results.affectedRows > 0) {
          resolve({ code: 200, message: "success" });
        } else {
          reject({ code: 401, message: "ProgressiveClaimReport without data not update" });
        }
      });
    });
  }


  
router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM ProgressiveClaimReport WHERE ProgressiveClaimReportID =${req.query.ProgressiveClaimReport}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({"code": 200, "message": "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})




module.exports = router;