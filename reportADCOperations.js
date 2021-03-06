const router = require("express").Router();
const mysql = require('mysql');
var databaseConnectionPool = require('./databaseConnection/databaseConnectionPool');
const pool =databaseConnectionPool;

router.post('/save', async(req, res) => {
    var checkForDuplicatesPromise = checkForDuplicates(req);
    
    checkForDuplicatesPromise.then((result) => {
      var insertReportAdcPromise = saveReportAdc(req);
      insertReportAdcPromise.then(allData => {
        return res.status(200).json({
          code: 200,
          message: "Data inserted sucessfully to the table ReportADC",
        });
      }).catch(err => {
        console.log("Error while inserting data to the ReportADC -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "Insertion failed to the table ReportADC",
          });
    })
    }).catch(err => {
      console.log("Error while inserting data to the ReportADC -->"+ err);
      return res.status(400).json({
          code: 400,
          message: "Insertion failed to the table ReportADC  -- " + err,
        });
  })
    
});

function checkForDuplicates(req) {
  var inputDate = new Date(req.body.Report_Month);
  return new Promise((resolve, reject) => {
    let query = `select * from ReportADC where SiteID = ${req.body.SiteID} and Report_Month like '${inputDate.getFullYear()}-${(((inputDate.getMonth() + 1) < 10) ? '0' : '') + (inputDate.getMonth() + 1)}%'`;
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

router.get('/get', async(req, res) => {
    var getReportAdbByIdPromise = getReportAdbByReportMonth(req);
    var authorizePromise = getAuthPromiseData(req);
    Promise.all([getReportAdbByIdPromise, authorizePromise])
    .then(allData => {
        var data = allData[0];
        var authImageData = allData[1];
        if(authImageData.length > 0) {
          isAuthorized = true;
          authImageUrl = authImageData[0].SignatureImageUrl;
          SignedBy = authImageData[0].name
        } else {
          isAuthorized = false;
          authImageUrl = "";
          SignedBy = "";
        }
        console.log(authImageData);
        return res.status(200).json({
            code: 200,
            data,
            isAuthorized,
            authImageUrl,
            SignedBy
          });
    })
    .catch(err => {
        console.log("Error while getting data to the ReportADC -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "Getting data from table ReportADC failed",
          });
    })
});

function getAuthPromiseData(req) {
  return new Promise((resolve, reject) => {
    let query = `
    SELECT SignatureImageUrl, Contact.ContactName as name from AuthorizeStatusReports 
    join Contact on Contact.ContactID = AuthorizeStatusReports.AcknowledgedBy
    where StatusReportType = 'ADC' and AcknowledgedBy = ${req.query.ContactID} 
  and StatusMonthAndYear = '${req.query.month}-${req.query.year}'
  `;
    pool.query(query, function (error, results, fields) {
      if (error) throw error;
      resolve(results);
    });
  });
}

router.put('/update', async(req, res) => {

    var updateReportAdcPromise = updateReportADC(req);
    Promise.all([updateReportAdcPromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ReportADC updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the ReportADC -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table ReportADC failed",
          });
    })
})


router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM ReportADC WHERE ReportADCID =${req.query.ReportADCID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({"code": 200, "message": "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

function updateReportADC(req) {
  return new Promise((resolve, reject) => {
    let detail = req.body;
    let query =
      `Update ReportADC SET  ` +
      Object.keys(detail)
        .map((key) => `${key}=?`)
        .join(",") +
      " where ReportADCID = ?";
    const parameters = [...Object.values(detail), req.query.ReportADCID];
    pool.query(query, parameters, function (err, results, fields) {
      if (err) throw err;

      if (results.affectedRows > 0) {
        resolve({ code: 200, message: "success" });
      } else {
        reject({ code: 401, message: "ReportADC without data not update" });
      }
    });
  });
}

function getReportAdbByReportMonth(req) {
    return new Promise((resolve, reject) => {
      var getQuery = ``;
      if (req.query.Staff == 'true')
      {
        getQuery = `Select ReportADC.*, Site.SiteName  from ReportADC
        JOIN Site on Site.SiteID = ReportADC.SiteID
        where Report_Month like '${req.query.year}-${req.query.month}%'`;
      }
      else
      {
        getQuery = `Select ReportADC.*, Site.SiteName  from ReportADC
        JOIN Site on Site.SiteID = ReportADC.SiteID
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
    })
}

function saveReportAdc(req) {
    return new Promise((resolve, reject) => {
        var insertQuery = "INSERT INTO ReportADC (ReportADCID, SiteID, ADC_W1, ADC_W2, ADC_W3, ADC_W4, ADC_W5, HAP_W1, HAP_W2, HAP_W3, HAP_W4, HAP_W5, Remarks, Report_Month, UpdateUserID, UpdateDateTime) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
        let parameters = ["", req.body.SiteID, req.body.ADC_W1, req.body.ADC_W2, req.body.ADC_W3, req.body.ADC_W4, 
        req.body.ADC_W5, req.body.HAP_W1, req.body.HAP_W2, req.body.HAP_W3, req.body.HAP_W4, req.body.HAP_W5, 
        req.body.Remarks, req.body.Report_Month, req.body.UpdateUserID, req.body.UpdateDateTime]
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
module.exports = router;