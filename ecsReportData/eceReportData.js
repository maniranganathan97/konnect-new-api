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
            message: "Data inserted sucessfully to the table ECSReportData",
          });
    })
});

function saveEcsReportData(req) {
    return new Promise((resolve, reject) => {

        var inseryQuery = `insert into ECSReportData (
            ECSReportDataID
            ,SiteZoneID
            ,SiteTypeID
            ,SiteID
            ,ReportDate
            ,NumberOfMC
            ,NumberOfTC
            ,NumberOfCPC
            ,Worker1
            ,Worker2
            ,Worker3
            ,UpdatedByUserID
            ,UpdatedDateTime
            

        ) values (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        let parameters = ["", req.body.SiteZoneID, req.body.SiteTypeID, req.body.SiteID, req.body.ReportDate, 
        req.body.NumberOfMC, req.body.NumberOfTC,req.body.NumberOfCPC, req.body.Worker1,req.body.Worker2
        , req.body.Worker3, req.body.UpdatedByUserID, req.body.UpdatedDateTime]
        
        pool.query(inseryQuery, parameters, (err, results) => {
            if(err) throw err;
            if (results.affectedRows > 0) {
                resolve(results)
              } else {
                reject("Insert into ECSReportData failed")
              }
        })
    });
}

router.get('/getAll', async (req, res) => {
    let query = `select * from ECSReportData`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No ECSReportData data available." })
        }

    })
});



router.put('/update', async(req, res) => {

    var updateECSReportDataPromise = updateECSReportDataData(req);
    Promise.all([updateECSReportDataPromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ECSReportData updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the ECSReportData -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table ECSReportData failed",
          });
    })
})


function updateECSReportDataData(req) {
    return new Promise((resolve, reject) => {
      let detail = req.body;
      if (!!!detail['ECSReportDataID']) {
        var inseryQuery = `insert into ECSReportData (
          ECSReportDataID
          ,SiteZoneID
          ,SiteTypeID
          ,SiteID
          ,ReportDate
          ,NumberOfMC
          ,NumberOfTC
          ,NumberOfCPC
          ,Worker1
          ,Worker2
          ,Worker3
          ,UpdatedByUserID
          ,UpdatedDateTime
          

      ) values (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
      let parameters = ["", req.body.SiteZoneID, req.body.SiteTypeID, req.body.SiteID, req.body.ReportDate, 
      req.body.NumberOfMC, req.body.NumberOfTC,req.body.NumberOfCPC, req.body.Worker1,req.body.Worker2
      , req.body.Worker3, req.body.UpdatedByUserID, req.body.UpdatedDateTime]
      
      pool.query(inseryQuery, parameters, (err, results) => {
          if(err) throw err;
          if (results.affectedRows > 0) {
              resolve(results)
            } else {
              reject("Insert into ECSReportData failed")
            }
      })


      } else {
        let query =
        `Update ECSReportData SET  ` +
        Object.keys(detail)
          .map((key) => `${key}=?`)
          .join(",") +
        " where ECSReportDataID = ?";
      const parameters = [...Object.values(detail), req.body.ECSReportDataID];
      pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err;
  
        if (results.affectedRows > 0) {
          resolve({ code: 200, message: "success" });
        } else {
          reject({ code: 401, message: "ECSReportData without data not update" });
        }
      });
      }
      
    });
  }


  
router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM ECSReportData WHERE ECSReportDataID =${req.query.ECSReportDataID}`
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