const router = require("express").Router();
const mysql = require('mysql');

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
    })
});

function saveEcsReportData(req) {
    return new Promise((resolve, reject) => {

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
        let parameters = ["", req.body.SiteZoneID, req.body.SiteTypeID, req.body.SiteID, req.body.ReportDate, 
        req.body.ReportTypeID, req.body.ManualReportURL,req.body.AddedByUserID, req.body.AddedDateTime]
        
        pool.query(inseryQuery, parameters, (err, results) => {
            if(err) throw err;
            if (results.affectedRows > 0) {
                resolve(results)
              } else {
                reject("Insert into ManualReport failed")
              }
        })
    });
}

router.get('/getAll', async (req, res) => {
    let query = `select * from ManualReport`
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