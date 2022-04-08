const router = require("express").Router();
const mysql = require('mysql');

const pool = mysql.createPool({
    host: '184.168.117.92',
    user: 'userCreation',
    password: 'Vp6f}9)U?u)r',
    database: 'PEST',
    multipleStatements: true,
    dateStrings: true
})

router.post('/save', async(req, res) => {

    var savePromise = saveCompanyData(req);
    Promise.all([savePromise]).then((data) => {
        return res.status(200).json({
            code: 200,
            message: "Data inserted sucessfully to the table Company",
          });
    })
});

function saveCompanyData(req) {
    return new Promise((resolve, reject) => {

        var inseryQuery = 'insert into Company (CompanyID, CompanyName, BillingAddress1, BillingAddress2, BillingPostCode, UpdatedByUserID, UpdatedDateTime) values (?,?,?,?,?,?,?)';
        let parameters = ["", req.body.CompanyName, req.body.BillingAddress1, req.body.BillingAddress2, req.body.BillingPostCode, 
        req.body.UpdatedByUserID, req.body.UpdatedDateTime]
        
        pool.query(inseryQuery, parameters, (err, results) => {
            if(err) throw err;
            if (results.affectedRows > 0) {
                resolve(results)
              } else {
                reject("Insert into Company failed")
              }
        })
    });
}

router.get('/getAll', async (req, res) => {
    let query = `select * from Company`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No company data available." })
        }

    })
});



router.put('/update', async(req, res) => {

    var updateCompanyPromise = updateCompanyData(req);
    Promise.all([updateCompanyPromise])
    .then(allData => {
       
        return res.status(200).json({
            code: 200,
            data: "ReportDSSD updated successfully."
          });
    })
    .catch(err => {
        console.log("Error while updating data to the Company -->"+ err);
        return res.status(400).json({
            code: 400,
            message: "updating data for table Company failed",
          });
    })
})


function updateCompanyData(req) {
    return new Promise((resolve, reject) => {
      let detail = req.body;
      let query =
        `Update Company SET  ` +
        Object.keys(detail)
          .map((key) => `${key}=?`)
          .join(",") +
        " where CompanyID = ?";
      const parameters = [...Object.values(detail), req.query.CompanyID];
      pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err;
  
        if (results.affectedRows > 0) {
          resolve({ code: 200, message: "success" });
        } else {
          reject({ code: 401, message: "Company without data not update" });
        }
      });
    });
  }


  
router.delete('/delete', async (req, res) => {
    let query = `DELETE FROM Company WHERE CompanyID =${req.query.CompanyID}`
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