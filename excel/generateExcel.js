const router = require("express").Router();
const mysql = require('mysql');
const uuid = require('uuid');
const Multer = require('multer');
const path = require('path')
const bodyParser = require('body-parser')
const { format } = require('util')
const moment = require('moment');
// var excel = require('excel4node');
const excel = require("exceljs");

const { Storage } = require('@google-cloud/storage');
const { resolve } = require("path");
const { rejects } = require("assert");
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

const pool = mysql.createPool({
    host: '184.168.117.92',
    user: 'userCreation',
    password: 'Vp6f}9)U?u)r',
    database: 'PEST',
    multipleStatements: true,
    dateStrings: true
});


const populateData = (xxx) => {
  if(!xxx || !xxx.pointsData || xxx.pointsData.length == 0) {
    return;
  }
  let headers = Array.from(new Set(xxx.pointsData.map(d => d.PointNumber)))
  // console.log(headers)

  let finalData = []


  const getWeekParam = (date) => {
    const d = new Date(date)
    const weekOfMondayDate = new Date(d.setDate(d.getDate() - d.getDay() + 1)).getDate();
    const getMonthFromDate = d.getMonth() + 1
    return ('0' + weekOfMondayDate).slice(-2) + "/" + ('0' + getMonthFromDate).slice(-2) + "/" + d.getFullYear()
  }

  let pointsJson = {}


  headers.map(header => pointsJson[header] = [])

  let pointsJsonTwo = {}
  xxx.ecsReports.map(data => pointsJsonTwo[getWeekParam(data.ScanDateTime)] = {})
  Object.keys(pointsJsonTwo).map(key => pointsJsonTwo[key] = pointsJson)

  let Weeks = xxx.ecsReports.map(data => getWeekParam(data.ScanDateTime))
  Weeks = [...new Set(Weeks)]

  let firstWeekData = {}
  let secondWeekData = {}
  let thirdWeekData = {}
  let fourthWeekData = {}
  let fifthWeekData = {}

  headers.map(header => {
    firstWeekData[header] = []
    secondWeekData[header] = []
    thirdWeekData[header] = []
    fourthWeekData[header] = []
    fifthWeekData[header] = []
  })

  xxx.ecsReports.map(data => {
    
    
    let week = getWeekParam(data.ScanDateTime)
    if (week === Weeks[0]) {
      firstWeekData[data.PointNumber].push(data.ScanDateTime)
    }
    else if (week === Weeks[1]) {
      secondWeekData[data.PointNumber].push(data.ScanDateTime)
    }
    else if (week === Weeks[2]) {
      thirdWeekData[data.PointNumber].push(data.ScanDateTime)
    }
    else if (week === Weeks[3]) {
      fourthWeekData[data.PointNumber].push(data.ScanDateTime)
    }
    else if (week === Weeks[4]) {
      fifthWeekData[data.PointNumber].push(data.ScanDateTime)
    }
  })

  Object.keys(pointsJsonTwo).map(week => {
    if (week === Weeks[0]) {
      pointsJsonTwo[week] = firstWeekData
    }
    else if (week === Weeks[1]) {
      pointsJsonTwo[week] = secondWeekData
    }
    else if (week === Weeks[2]) {
      pointsJsonTwo[week] = thirdWeekData
    }
    else if (week === Weeks[3]) {
      pointsJsonTwo[week] = fourthWeekData
    }
    else if (week === Weeks[4]) {
      pointsJsonTwo[week] = fifthWeekData
    }
  })

  // console.log(pointsJsonTwo)

  Object.keys(pointsJsonTwo).map(key => {
    Object.keys(pointsJsonTwo[key]).map(point => pointsJsonTwo[key][point].sort(function (a, b) {
      return new Date(b) - new Date(a);
    }))
  })
  // console.log("-----------------------------------------------------------")
  // console.log(pointsJsonTwo)

  for (let i = 0; i < 6; i++) {
    Object.keys(pointsJsonTwo).map(key => {

      Object.keys(pointsJsonTwo[key]).map(point => {
        let availableDates = []
        pointsJsonTwo[key][point].map((date, index) => {
          // console.log(date)
          // console.log(key)
          // console.log(point)
          if (availableDates.includes(moment(date).format("DD/MM/YYYY"))) {
            // console.log("Already There")
            pointsJsonTwo[key][point].splice(index, 1);
          }
          else {
            // console.log("Not Present..Added")
            availableDates.push(moment(date).format("DD/MM/YYYY"))
          }
          // console.log(availableDates)
        })
      })
    })


  }


  // console.log("-----------------------------------------------------------")
  // console.log(pointsJsonTwo)


  Object.keys(pointsJsonTwo).map(key => {
    Object.keys(pointsJsonTwo[key]).map(point => pointsJsonTwo[key][point].sort(function (a, b) {
      return new Date(a) - new Date(b);
    }))
  })
  // console.log("-----------------------------------------------------------")
  // console.log(pointsJsonTwo)

  const checkIfBExists = (data) => {
    let res = false
    Object.keys(data).map(key => {
      if (data[key].length > 1) {
        res = true
      }
    })
    return res
  }

  const getWeekData = (d) => {
    switch (d) {
      case 1:
        return '1st'
      case 2:
        return '2nd'
      case 3:
        return '3rd'
      case 4:
        return '4th'
      default:
        return '5th'
    }
  }
  Object.keys(pointsJsonTwo).map((key, index) => {
    if (checkIfBExists(pointsJsonTwo[key])) {
      let tempOne = {}
      let tempTwo = {}
      tempOne["Week"] = getWeekData(index + 1);
      tempOne["Date Of Visit"] = key;
      headers.map(header => tempOne[`Point ${header}`] = "")

      Object.keys(pointsJsonTwo[key]).map(point => {
        tempOne[`Point ${point}`] = pointsJsonTwo[key][point][0];
      })
      finalData.push(tempOne)

      tempTwo["Week"] = getWeekData(index + 1);
      tempTwo["Date Of Visit"] = key;
      headers.map(header => tempTwo[`Point ${header}`] = "")

      Object.keys(pointsJsonTwo[key]).map(point => {
        tempTwo[`Point ${point}`] = pointsJsonTwo[key][point][1];
      })
      finalData.push(tempTwo)
    }
    else {
      let temp = {}
      temp["Week"] = getWeekData(index + 1);
      temp["Date Of Visit"] = key;
      headers.map(header => temp[`Point ${header}`] = "")

      Object.keys(pointsJsonTwo[key]).map(point => {
        temp[`Point ${point}`] = pointsJsonTwo[key][point][0];
      })
      finalData.push(temp)
    }

  })

  let modifiedHeader = headers.map(header => `Point ${header}`)
  modifiedHeader.unshift("Date Of Visit")
  modifiedHeader.unshift("Week")
  checkCounts(finalData, xxx.siteTypeName, xxx.siteName);
  return {
    header: modifiedHeader,
    data: finalData
  }

}
const checkCounts = (finalData, siteTypeName, siteName) => {
  var total = 0;
  var validCount = 0;
  for(var i=0; i< finalData.length; i++) {
    var singleData = finalData[i];
    Object.keys(singleData).map(key => {
      if(key.indexOf("Point ")> -1) {
        if(singleData[key] != undefined) {
          validCount++;
        }
        total++;
      }
    })
  }
  if(finalData && finalData[0]) {
    finalData[0]["validPoints"] = total;
    finalData[0]["emptyPoints"] = total - validCount;
    finalData[0]["siteName"] = siteTypeName;
    finalData[0]["siteTypeName"] = siteName;
  }
}

function getEcsDataBasedOnCondition(req) {
  return new Promise((resolve, reject) => {
    let query = `
    SELECT * from ECSReportData
    where SiteZoneID =1
and SiteTypeID = 1
AND SiteID = 1
AND MONTH(ReportDate) = MONTH('2022-04-03') AND YEAR(ReportDate) = YEAR('2022-04-03')
    `;
    pool.query(query, function (err, results) {
      if (err) throw err;
      resolve(results);
    });
  });
}

 function getAllData(req) {
   return new Promise((resolve, reject) => {
    let obj = {}
    let pointQuery = `SELECT Point_Details.PointID,PointNumber FROM Point_Details
    JOIN Site ON Point_Details.SiteID = Site.SiteID
    WHERE Point_Details.SiteID =${req.SiteID} AND  Site.SiteTypeID = ${req.SiteTypeID}
    ORDER BY Cast(Point_Details.PointNumber as UNSIGNED)
    `

    var query = '';
    if(true) {
      query = `Select Scan_Details.*,Point_Details.PointNumber from Scan_Details 
      JOIN Point_Details ON Scan_Details.PointID = Point_Details.PointID
      WHERE Scan_Details.PointID IN (
          
      SELECT Point_Details.PointID FROM Point_Details
      JOIN Site ON Point_Details.SiteID = Site.SiteID
      WHERE Point_Details.SiteID = ${req.SiteID} AND Site.SiteTypeID = ${req.SiteTypeID}
      
      )
      AND MONTH(Scan_Details.ScanDateTime) = '${req.query.referenceMonth}' AND YEAR(Scan_Details.ScanDateTime) = '${req.query.referenceYear}'
      ORDER BY Scan_Details.PointID,Scan_Details.ScanDateTime ASC`

    } else {
        query = `Select Scan_Details.*,Point_Details.PointNumber from Scan_Details 
        JOIN Point_Details ON Scan_Details.PointID = Point_Details.PointID
        WHERE Scan_Details.PointID IN (SELECT Point_Details.PointID FROM Point_Details
        JOIN Site ON Point_Details.SiteID = Site.SiteID
        WHERE Point_Details.SiteID = ${req.query.SiteID} AND Point_Details.SiteZoneID=${req.query.SiteZoneID} AND Site.SiteTypeID = ${req.query.SiteTypeID}
        and WEEK(Point_Details.ScanDateTime) = WEEK(NOW()) - 1 
        )
        AND MONTH(Scan_Details.ScanDateTime) = MONTH('${req.query.ScanDateTime}') AND YEAR(Scan_Details.ScanDateTime) = YEAR('${req.query.ScanDateTime}')
        ORDER BY Scan_Details.PointID,Scan_Details.ScanDateTime ASC`
    }
    var siteDetailPromise = getSiteNameByQueryData(req);
    var siteTypePromise = getSiteTypeByQueryData(req);

    pool.query(query, function (err, results) {

        if (err) throw err

            pool.query(pointQuery, function (err, pointQuery) {
              if (err) throw err
              
              Promise.all([siteDetailPromise, siteTypePromise]).then(details => {
                var siteName = details[0];
                var siteType = details[1];
                obj['pointsData'] = pointQuery
                obj['ecsReports'] = results;
                obj['siteName'] = siteName[0].SiteName;
                obj['siteTypeName'] = siteType[0].Description;
                updatePoints(results, obj);
              
                resolve(obj);
              })
              

            })

    })
   })
 }

 function updatePoints(ecsResults, obj) {

  var validPoints = 0 ;
  var emptyPoints = 0;
  for(var i=0; i< ecsResults.length; i++) {
    var singleObject = ecsResults[i];
    if(singleObject.ScanDateTime!=undefined || singleObject.ScanDateTime !='') {
      validPoints++;
    } else {
      emptyPoints++;
    }
  }
  obj['validPoints'] = validPoints;
  obj['emptyPoints'] = emptyPoints;
 }


 function getSiteZoneData() {
   return new Promise((resolve, reject) => {
     pool.query(`select * from SiteZone`, function (error, results, fields) {
       if (error) throw error;
       resolve(results);
     });
   });
 }
 function getSiteTypeData() {
   return new Promise((resolve, reject) => {
     pool.query(`select * from SiteType`, function (error, results, fields) {
       if (error) throw error;
       resolve(results);
     });
   });
 }
 function getSiteNameByQueryData(data) {
   return new Promise((resolve, reject) => {
    var query = `select * from Site where SiteID=${data.SiteID}`
     pool.query(query, function (error, results, fields) {
       if (error) throw error;
       resolve(results);
     });
   });
 }
 function getSiteTypeByQueryData(data) {
   return new Promise((resolve, reject) => {
    var query = `select * from SiteType where SiteTypeID=${data.SiteTypeID}`
     pool.query(query, function (error, results, fields) {
       if (error) throw error;
       resolve(results);
     });
   });
 }
 function getSiteNameData(data) {
   return new Promise((resolve, reject) => {
    var query = `select * from Site where SiteTypeID=${data.SiteTypeID}`
     pool.query(query, function (error, results, fields) {
       if (error) throw error;
       resolve(results);
     });
   });
 }

router.get("/download", async (req, res) => {
  let getSiteZone = getSiteZoneData();
  let getSiteType = getSiteTypeData();

  let workbook = new excel.Workbook();
  // let worksheet = workbook.addWorksheet("Tutorials");
  let totalRows = [];
  var siteNamePromiseArray =[]
  
  var pointDetailPromises = [];
  
  Promise.all([getSiteZone, getSiteType]).then((allData) => {
    var siteZoneData = allData[0];
    var siteTypeData = allData[1];
    console.log("siteZoneDate--->" + siteZoneData.length);
    console.log("siteTypeDate--->" + siteTypeData.length);
    for(var i=0; i<siteTypeData.length; i++) {
      let singleSiteType = siteTypeData[i];
      let getSiteNameDataPromise = getSiteNameData(singleSiteType);
      siteNamePromiseArray.push(getSiteNameDataPromise);
     
    }
    Promise.all(siteNamePromiseArray).then(sitePromiseData => {
      // let siteNameData = sitePromiseData[0];
      for(var k=0; k<sitePromiseData.length; k++) {
        var siteNameData = sitePromiseData[k]
        for(var j=0; j<siteNameData.length; j++) {
          let singleSiteNameData = siteNameData[j];
          req.SiteID = singleSiteNameData.SiteID;
          req.SiteTypeID = singleSiteNameData.SiteTypeID;
          req.ScanDateTime = req.body.referenceMonth;
          console.log("req.SiteTypeID---------> " + req.SiteTypeID);
          console.log("req.SiteID---------> " + req.SiteID);
          var getAllDatePromise = getAllData(req);
          pointDetailPromises.push(getAllDatePromise);
  
        }
      }
      console.log("pointDetailPromises length------->" + pointDetailPromises.length);
      Promise.all(pointDetailPromises).then(pointsData => {
        CreateWorkbook(pointsData, res, req)
        //return res.status(200).send(pointsData)
      })
      
    });
    
  })
});

//Create Excel workbook
function CreateWorkbook(pointsData, res,req) 
{
  let workbook = new excel.Workbook();
  let worksheet = workbook.addWorksheet("EcsReport_" + req.query.referenceMonth + req.query.referenceYear);
  let headerData = populateData(pointsData[0]);
  var cell = worksheet.getCell('A1');
  cell.value = 'Contract No: '
  cell = worksheet.getCell('D1');
  cell.value = ""
  cell = worksheet.getCell('A2');
  cell.value = 'Contract Title: '
  cell = worksheet.getCell('D2');
  cell.value = ""
  cell = worksheet.getCell('A3');
  cell.value = "CLOCKING RECORD "
  cell = worksheet.getCell('A4');
  cell.value = "Progress Claim No : "
  cell = worksheet.getCell('D4');
  cell.value = "";
  cell = worksheet.getCell('P4');
  cell.value = "Progress Claim Date :	  ";
  cell = worksheet.getCell('W4');
  cell.value = "";
  cell = worksheet.getCell('A5');
  cell.value = "For the value of work carried out under the Contract up to the end of the reference month of :  ";

  cell = worksheet.getCell('W5');
  cell.value = req.query.referenceMonth + "-" + req.query.referenceYear ;
  var excelColumns = [];
//   excelColumns.push({
//     header: "Site Type Name",
//     key: "siteTypeName",
//     width: 10,
// });
  excelColumns.push({
    header: "Site Name",
    key: "siteName",
    width: 10,
});
  excelColumns.push({
    header: "Week",
    key: "Week",
    width: 10,
});
  excelColumns.push({
    header: "Date Of Visit",
    key: "Date Of Visit",
    width: 10,
});
  for (var i = 1; i <= 18; i++) {
      excelColumns.push({
          header: "Point " + i,
          key: "Point " + i,
          width: 10,
      });
  }
  excelColumns.push({
    header: "No. of Points",
    key: "validPoints",
    width: 10,
});
  excelColumns.push({
    header: "No. of Missing Points",
    key: "emptyPoints",
    width: 10,
});
  console.log("excelColumns---->" + JSON.stringify(excelColumns));
  var headerValues = excelColumns.map(key => key.header)
  worksheet.getRow(6).values = headerValues;
  var columnValues = []
  for (let index = 0; index < excelColumns.length; index++) {
    const element = excelColumns[index];
    var obj = {
      "key": element.key
    }
    columnValues.push(obj);
  }
  // var columnValues = excelColumns.forEach(key =>  {key:key.key});
  worksheet.columns = columnValues;
  for(var i=0; i< pointsData.length; i++) {
    var singlePointData = pointsData[i];
    let allData = populateData(singlePointData);
    var rows = [];
    if(!allData) {
      rows.push("");
      continue;
    }
    Object.keys(allData.data).map((key) => {
        var singleObject = {};
        Object.keys(allData.data[key]).map((key1) => {
            // console.log("key ---------> " + key1);
            // console.log("value ---------> " + allData.data[key][key1]);

            if(key1.indexOf("emptyPoints") > -1 || key1.indexOf("validPoints") > -1) {
              singleObject[key1] = allData.data[key][key1];
            }
            else if (key1.indexOf("Point ") > -1) {
                var timeFromScanDate =
                    allData.data[key][key1] != undefined
                      ? new Date(allData.data[key][key1]).toLocaleString(
                        "en-IN", {
                    hour: "numeric",
                    minute: "numeric",
                })
                      : "";
                singleObject[key1] = timeFromScanDate;
            } else {
                singleObject[key1] = allData.data[key][key1];
            }
        });
        rows.push(singleObject);
    });
    worksheet.addRows(rows);
  }
  // console.log("rows------->" + rows.length);
  //   worksheet.addRow(rows);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + "EcsReport.xlsx"
    );
    return workbook.xlsx.write(res).then(function () {
      res.status(200).end();
    });
}


module.exports = router;