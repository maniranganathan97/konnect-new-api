const router = require("express").Router();
const mysql = require('mysql');
var databaseConnectionPool = require('./databaseConnection/databaseConnectionPool');
const pool =databaseConnectionPool;


router.post('/save', async(req, res) => {
  var checkForDuplicatesPromise = checkForDuplicates(req);
  
    checkForDuplicatesPromise.then((result) => {

      var insertReportDssdPromise = saveReportDssd(req);
      insertReportDssdPromise.then(allData => {
        return res.status(200).json({
          code: 200,
          message: "Data inserted sucessfully to the table ReportDSSD",
        });
      }).catch(err => {
        console.log("Error while inserting data to the ReportDSSD -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "Insertion failed to the table ReportDSSD",
          });
    })
    }).catch(err => {
      console.log("Error while inserting data to the ReportDSSD -->"+ err);
      return res.status(400).json({
          code: 400,
          message: "Insertion failed to the table ReportDSSD  -- " + err,
        });
  })
});


function checkForDuplicates(req) {
  var inputDate = new Date(req.body.Report_Month);
  return new Promise((resolve, reject) => {
    let query = `select * from ReportDSSD where SiteID = ${req.body.SiteID} and  Report_Month like '${inputDate.getFullYear()}-${(((inputDate.getMonth() + 1) < 10) ? '0' : '') + (inputDate.getMonth() + 1)}%'`;
    pool.query(query, function (error, results, fields) {
      if (error) throw error;
      if (results.length > 0) {
        reject("Already data available for the selected Month and Year, Please select another month or year...");
      } else {
        resolve("No data");
      }
    });
  });
}

function saveReportDssd(req) {
    return new Promise((resolve, reject) => {
        var insertQuery = "INSERT INTO ReportDSSD (ReportDSSDID, SiteID, Monthly_Rate, SS_A, SS_B, SS_C, SS_D, SS_E, SS_F, D_A, D_B, D_C, D_D, D_E, D_F, Total_D, Report_Month, UpdatedUserID, UpdateDateTime) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        let parameters = ["", req.body.SiteID, req.body.Monthly_Rate, req.body.SS_A, req.body.SS_B, req.body.SS_C, 
        req.body.SS_D, req.body.SS_E, req.body.SS_F, req.body.D_A, req.body.D_B, req.body.D_C, 
        req.body.D_D, req.body.D_E, req.body.D_F, req.body.Total_D, req.body.Report_Month, req.body.UpdatedUserID, req.body.UpdateDateTime]
        pool.query(insertQuery, parameters, function (err, result) {
            if (err) throw err;
            if (result.affectedRows > 0) {
              resolve(result)
            } else {
                reject("Insert into ReportADC failed")
            }
          });
    })
}


router.get('/get', async(req, res) => {
    var getReportDssdByIdPromise = getReportDssdByReportMonth(req);
    var authorizePromise = getAuthPromiseData(req);
    Promise.all([getReportDssdByIdPromise, authorizePromise])
    .then(allData => {
      var data = allData[0];
      var authImageData = allData[1];
      if(authImageData.length > 0) {
        isAuthorized = true;
        authImageUrl = authImageData[0].SignatureImageUrl
      } else {
        isAuthorized = false;
        authImageUrl = "";
      }
      console.log(authImageData);
      return res.status(200).json({
          code: 200,
          data,
          isAuthorized,
          authImageUrl
        });
    })
    .catch(err => {
        console.log("Error while getting data to the ReportDSSD -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "Getting data from table ReportDSSD failed",
          });
    })
});

function getAuthPromiseData(req) {
  return new Promise((resolve, reject) => {
    let query = `
  SELECT SignatureImageUrl from AuthorizeStatusReports where StatusReportType = 'DSSD' and AcknowledgedBy = ${req.query.ContactID} 
  and StatusMonthAndYear = '${req.query.month}-${req.query.year}'
  `;
    pool.query(query, function (error, results, fields) {
      if (error) throw error;
      resolve(results);
    });
  });
}

function getReportDssdByReportMonth(req) {
    return new Promise((resolve, reject) => {
      var getQuery = ``;
      if (req.query.Staff == "true") {
        getQuery = `Select ReportDSSD.*, Site.SiteName from ReportDSSD 
        JOIN Site on Site.SiteID = ReportDSSD.SiteID
        where Report_Month like '${req.query.year}-${req.query.month}%'`;
      } else {
        getQuery = `Select ReportDSSD.*, Site.SiteName from ReportDSSD 
        JOIN Site on Site.SiteID = ReportDSSD.SiteID
        where Report_Month like '${req.query.year}-${req.query.month}%'
        and Site.SiteID IN (SELECT SiteID FROM Contact_Site WHERE ContactID = ${req.query.ContactID})
        `;
      }
      pool.query(getQuery, function (err, result) {
        if (err) throw err;
        if (result.length > 0) {
          resolve(result);
        } else {
          resolve(result);
        }
      });
    });
}


router.put('/update', async(req, res) => {

    var updateReportDssdPromise = updateReportDssd(req);
    Promise.all([updateReportDssdPromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ReportDSSD updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the ReportDSSD -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table ReportDSSD failed",
          });
    })
})


function updateReportDssd(req) {
    return new Promise((resolve, reject) => {
      let detail = req.body;
      let query =
        `Update ReportDSSD SET  ` +
        Object.keys(detail)
          .map((key) => `${key}=?`)
          .join(",") +
        " where ReportDSSDID = ?";
      const parameters = [...Object.values(detail), req.query.ReportDSSDID];
      pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err;
  
        if (results.affectedRows > 0) {
          resolve({ code: 200, message: "success" });
        } else {
          reject({ code: 401, message: "ReportDSSD without data not update" });
        }
      });
    });
  }


  
router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM ReportDSSD WHERE ReportDSSDID =${req.query.ReportDSSDID}`
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