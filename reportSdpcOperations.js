const router = require("express").Router();
const mysql = require('mysql');
var databaseConnectionPool = require('./databaseConnection/databaseConnectionPool');
const pool =databaseConnectionPool;



router.post('/save', async(req, res) => {

  var checkForDuplicatesPromise = checkForDuplicates(req);
  
    checkForDuplicatesPromise.then((result) => {
      var insertReportSdpcPromise = saveReportSdpc(req);
      insertReportSdpcPromise.then(allData => {
        return res.status(200).json({
          code: 200,
          message: "Data inserted sucessfully to the table ReportSDPC",
        });
      }).catch(err => {
        console.log("Error while inserting data to the ReportSDPC -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "Insertion failed to the table ReportSDPC",
          });
    })
    }).catch(err => {
      console.log("Error while inserting data to the ReportSDPC -->"+ err);
      return res.status(400).json({
          code: 400,
          message: "Insertion failed to the table ReportSDPC  -- " + err,
        });
  })


});



function checkForDuplicates(req) {
  var inputDate = new Date(req.body.Report_Month);
  return new Promise((resolve, reject) => {
    let query = `select * from ReportSDPC where  SiteID = ${req.body.SiteID} and Report_Month like '${inputDate.getFullYear()}-${(((inputDate.getMonth() + 1) < 10) ? '0' : '') + (inputDate.getMonth() + 1)}%'`;
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

function saveReportSdpc(req) {
    return new Promise((resolve, reject) => {
        var insertQuery = `INSERT INTO ReportSDPC (
          ReportSDPCID	
          ,SiteID
          ,UnitRate_Mosquito
          ,UnitRate_Termite	
          ,UnitRate_Pest	
          ,Deduction_A
          ,Deduction_B
          ,Deduction_C
          ,Deduction_Total
          ,Report_Month
          ,UpdatedUserID
          ,UpdateDateTime
        ) values (?,?,?,?,?,?,?,?,?,?,?,?)`
        let parameters = ["", req.body.SiteID, req.body.UnitRate_Mosquito, req.body.UnitRate_Termite, req.body.UnitRate_Pest, req.body.Deduction_A, 
        req.body.Deduction_B, req.body.Deduction_C, req.body.Deduction_Total, req.body.Report_Month, req.body.UpdatedUserID, req.body.UpdateDateTime]
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
    var getReportSdpcByIdPromise = getReportSdpcByReportMonth(req);
    var authorizePromise = getAuthPromiseData(req);
    Promise.all([getReportSdpcByIdPromise, authorizePromise])
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
        console.log("Error while getting data to the ReportSDPC -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "Getting data from table ReportSDPC failed",
          });
    })
});

function getAuthPromiseData(req) {
  return new Promise((resolve, reject) => {
    let query = `
  SELECT SignatureImageUrl from AuthorizeStatusReports where StatusReportType = 'SDPC' and AcknowledgedBy = ${req.query.ContactID} 
  and StatusMonthAndYear = '${req.query.month}-${req.query.year}'
  `;
    pool.query(query, function (error, results, fields) {
      if (error) throw error;
      resolve(results);
    });
  });
}

function getReportSdpcByReportMonth(req) {
    return new Promise((resolve, reject) => {
      var getQuery = `Select ReportSDPC.*, Site.SiteName from ReportSDPC 
        JOIN Site on Site.SiteID = ReportSDPC.SiteID
        where Report_Month like '${req.query.year}-${req.query.month}%'`;

      var getQuery = ``;
      if (req.query.Staff == "true") {
        getQuery = `Select ReportSDPC.*, Site.SiteName from ReportSDPC 
        JOIN Site on Site.SiteID = ReportSDPC.SiteID
        where Report_Month like '${req.query.year}-${req.query.month}%'`;
      } else {
        getQuery = `Select ReportSDPC.*, Site.SiteName from ReportSDPC 
        JOIN Site on Site.SiteID = ReportSDPC.SiteID
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

    var updateReportSdpcPromise = updateReportSdpc(req);
    Promise.all([updateReportSdpcPromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ReportSDPC updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the ReportSDPC -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table ReportSDPC failed",
          });
    })
})


function updateReportSdpc(req) {
    return new Promise((resolve, reject) => {
      let detail = req.body;
      let query =
        `Update ReportSDPC SET  ` +
        Object.keys(detail)
          .map((key) => `${key}=?`)
          .join(",") +
        " where ReportSDPCID = ?";
      const parameters = [...Object.values(detail), req.query.ReportSDPCID];
      pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err;
  
        if (results.affectedRows > 0) {
          resolve({ code: 200, message: "success" });
        } else {
          reject({ code: 401, message: "ReportSDPC without data not update" });
        }
      });
    });
  }


  
router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM ReportSDPC WHERE ReportSDPCID =${req.query.ReportSDPCID}`
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