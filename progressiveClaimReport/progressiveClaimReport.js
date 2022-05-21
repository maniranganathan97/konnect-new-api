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
  connectionLimit : 1000,
  connectTimeout  : 60 * 60 * 1000,
  acquireTimeout  : 60 * 60 * 1000,
  timeout         : 60 * 60 * 1000,
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

    var multipleFilesUploadPromise = multipleFilesUploadPromiseData(req.body["ProgressiveReportFile"]);
    Promise.all([multipleFilesUploadPromise]).then(data => {

      console.log(data[0]);
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
        JSON.stringify(data[0])
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


function multipleFilesUploadPromiseData(siteFilesArray) {
  return new Promise((resolve, reject) => {
      if(siteFilesArray && siteFilesArray.length == 0) {
          resolve([])
      }
      var filePathArray=[];
      for(var i=0; i<siteFilesArray.length; i++) {
          const buffer = Buffer.from(siteFilesArray[i].data, 'base64')
          // Create a new blob in the bucket and upload the file data.
          const id = uuid.v4();
          const blob = bucket.file(id+siteFilesArray[i].fileName);
          const blobStream = blob.createWriteStream();
  
          blobStream.on('error', err => {
              next(err);
          });
      
          blobStream.on('finish', () => {
              const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
              var fileDetail = {
                  name: blob.name.replace(id, ""),
                  data: publicUrl
              }
              filePathArray.push(fileDetail);
              //if last iteration then return 
              if(i==filePathArray.length) {
                  
                  resolve(filePathArray)
              }
  
          });
          blobStream.end(buffer);
      }
      
  
  })
}

function getProgressiveClaimReportAllData(req) {
    return new Promise((resolve, reject) => {
        let getQuery = `select * from ProgressiveClaimReport 
        `;
        pool.query(getQuery, function (err, result) {
          if (err) throw err;
          if (result.length > 0) {
            for(var i=0;i<result.length; i++) {
              result[i].FileURL = JSON.parse(result[i].FileURL)
            }
            
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


function alreadyAvailableFilesPromiseData(ProgressiveClaimReportID) {
  return new Promise((resolve, reject) => {
      let query = `select FileURL FROM ProgressiveClaimReport WHERE ProgressiveClaimReportID =${ProgressiveClaimReportID}`
  pool.query(query, function (error, results, fields) {
      if (error) throw error
      if (results.length > 0) {
          return resolve(results);
      } else {
          return resolve(results);
      }
  })
  })
}

router.put('/update', async(req, res) => {

  const detail = req.body

  if (detail['ProgressiveClaimURL']) {

      var multileFilesUploadPromise = multipleFilesUploadPromiseData(req.body["ProgressiveClaimURL"]);
      var alreadyAvailableFilesPromise = alreadyAvailableFilesPromiseData(req.query.ProgressiveClaimReportID);

      Promise.all([alreadyAvailableFilesPromise, multileFilesUploadPromise]).then(allData => {
          console.log("allData =========> \n"+allData);
          var alreadyAvailableFiles =  JSON.parse(allData[0][0].FileURL);
          var newFiles = [];
          for(var i=0; i< alreadyAvailableFiles.length; i++) {
              if(!req.body.toBeRemoved.find(singleFile => singleFile.name ===alreadyAvailableFiles[i].name )) {
                  console.log("deleted");
                  newFiles.push(alreadyAvailableFiles[i]);
              }
          }
          var updatedFiles = allData[1];
          for(var j=0; j< updatedFiles.length; j++) {
              if(!alreadyAvailableFiles.find(singleFile => singleFile.name ===updatedFiles[j].name )) {
                  newFiles.push(updatedFiles[j]);
              }
              
          }
          detail['FileURL'] = JSON.stringify(newFiles)
          delete detail["toBeRemoved"];
          delete detail["ProgressiveReportFile"];
          delete detail["ProgressiveClaimURL"];
          delete detail["ProgressiveClaimReportID"];
          delete detail["AddedByUserID"];
          delete detail["AddedDateTime"];

          let query = `Update ProgressiveClaimReport SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where ProgressiveClaimReportID = ?"
          const parameters = [...Object.values(detail), req.query.ProgressiveClaimReportID]
          pool.query(query, parameters, function (err, results, fields) {
              if (err) throw err
              if (results.affectedRows > 0) {
                  return res.status(200).json({ code: 200, message: "success" })
              } else {
                  return res.status(401).json({ code: 401, "message": "ProgressiveClaimReport with files data not update" })
              }
          })
      })

  } else {

      let query = `Update ProgressiveClaimReport SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where ProgressiveClaimReportID = ?"
      const parameters = [...Object.values(detail), req.query.ProgressiveClaimReportID]
      pool.query(query, parameters, function (err, results, fields) {
          if (err) throw err

          if (results.affectedRows > 0) {
              return res.status(200).json({ code: 200, message: "success" })
          } else {
              return res.status(401).json({ code: 401, "message": "ProgressiveClaimReport without data not update" })
          }
      })
  }

    // var updatePromise = updateProgressiveClaimReportData(req);
    // Promise.all([updatePromise])
    // .then(allData => {
       
    //     return res.status(200).json({
    //         code: 200,
    //         data: "ProgressiveClaimReport updated successfully."
    //       });
    // })
    // .catch(err => {
    //     console.log("Error while updating data to the ProgressiveClaimReport -->"+ err);
    //     return res.status(400).json({
    //         code: 400,
    //         message: "updating data for table ProgressiveClaimReport failed",
    //       });
    // })
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