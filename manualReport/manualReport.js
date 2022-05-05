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

    var savePromise = saveEcsReportData(req);
    Promise.all([savePromise]).then((data) => {
        return res.status(200).json({
            code: 200,
            message: "Data inserted sucessfully to the table ManualReport",
          });
    }).catch(err => {
        console.log(err);
        return res.status(400).json({
            code: 400,
            message: "Data inserted failed to the table ManualReport",
          });
    })
});

function saveEcsReportData(req) {
  return new Promise((resolve, reject) => {
    const buffer = Buffer.from(req.body["ManualReportURL"], "base64");
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    const blob = bucket.file("ManualReportURL" + id + ".pdf");
    const blobStream = blob.createWriteStream();

    blobStream.on("error", (err) => {
      next(err);
    });

    blobStream.on("finish", () => {
      // The public URL can be used to directly access the file via HTTP.
      const publicUrl = format(
        `https://storage.googleapis.com/${bucket.name}/${blob.name}`
      );

      var inseryQuery = `insert into ManualReport(
            ManualReportID			 
            ,SiteZoneID
            ,SiteTypeID
            ,SiteID
            ,ReportDate
            ,ReportTypeID
            ,ManualReportURL
            ,AddedByUserID
            ,AddedDateTime
        ) values (?,?,?,?,?,?,?,?,?)`;
      let parameters = [
        "",
        req.body.SiteZoneID,
        req.body.SiteTypeID,
        req.body.SiteID,
        req.body.ReportDate,
        req.body.ReportTypeID,
        publicUrl,
        req.body.AddedByUserID,
        req.body.AddedDateTime,
      ];

      pool.query(inseryQuery, parameters, (err, results) => {
        if (err) throw err;
        if (results.affectedRows > 0) {
          resolve(results);
        } else {
          reject("Insert into ManualReport failed");
        }
      });
    });
    blobStream.end(buffer);
  });
}

router.get('/getAll', async (req, res) => {
  let query ="";
  if (req.query.Staff == 'true')
  {
    query = `select DISTINCT ManualReport.*, SiteType.Description as SiteTypeName,
    SiteZone.Description as SiteZoneName, Site.SiteName, ManualReportType.ManualReportName as ReportTypeName
    from ManualReport JOIN SiteType on SiteType.SiteTypeID = ManualReport.SiteTypeID 
    JOIN SiteZone on SiteZone.SiteZoneID = ManualReport.SiteZoneID 
    JOIN Site on Site.SiteID = ManualReport.SiteID 
    JOIN ManualReportType on ManualReportType.ManualReportTypeID = ManualReport.ReportTypeID`
  }
  else
  {
    query = `select DISTINCT ManualReport.*, SiteType.Description as SiteTypeName,
    SiteZone.Description as SiteZoneName, Site.SiteName, ManualReportType.ManualReportName as ReportTypeName
    from ManualReport JOIN SiteType on SiteType.SiteTypeID = ManualReport.SiteTypeID 
    JOIN SiteZone on SiteZone.SiteZoneID = ManualReport.SiteZoneID 
    JOIN Site on Site.SiteID = ManualReport.SiteID 
    JOIN Contact_Site ON Contact_Site.SiteID = Site.SiteID
    JOIN ManualReportType on ManualReportType.ManualReportTypeID = ManualReport.ReportTypeID
    WHERE Site.SiteID IN (SELECT SiteID FROM Contact_Site WHERE ContactID = ${req.query.ContactID})`
  }    
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No ManualReport data available." })
        }

    })
});



router.put('/update', async(req, res) => {

    var updateManualReportPromise = updateManualReportData(req);
    Promise.all([updateManualReportPromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ManualReport updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the ManualReport -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table ManualReport failed",
          });
    })
})


function updateManualReportData(req) {
    return new Promise((resolve, reject) => {
      let detail = req.body;
      let query =
        `Update ManualReport SET  ` +
        Object.keys(detail)
          .map((key) => `${key}=?`)
          .join(",") +
        " where ManualReportID = ?";
      const parameters = [...Object.values(detail), req.query.ManualReportID];
      pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err;
  
        if (results.affectedRows > 0) {
          resolve({ code: 200, message: "success" });
        } else {
          reject({ code: 401, message: "ManualReport without data not update" });
        }
      });
    });
  }


  
router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM ManualReport WHERE ManualReportID =${req.query.ManualReportID}`
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