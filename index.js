
const express = require('express')
const uuid = require('uuid')
const base = require('./base64.json')
const { format } = require('util')
const cors = require('cors')
const Multer = require('multer')
const path = require('path')
const bodyParser = require('body-parser')
const app = express()
const mailOperations = require("./mailOperations")
const jwt = require('jsonwebtoken');
const moment = require('moment');

app.use(express.json({ limit: '50mb' }))
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true
}));

const { Storage } = require('@google-cloud/storage')
const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // no larger than 5mb, you can change as needed.
    },
})

const gc = new Storage({
    keyFilename: path.join(__dirname, './keys.json'),
    projectId: 'nodejsapiengine'
})
const bucket = gc.bucket('images-pest')

/*async function removeBucketCors() {
    await storage.bucket(bucketName).setCorsConfiguration([]);
  
    console.log(`Removed CORS configuration from bucket ${bucketName}`);
  }
  
  removeBucketCors().catch(console.error);*/

app.use('/uploads', express.static('uploads'))

//mysql 
const mysql = require('mysql');
const { Console } = require('console')
const { resolve } = require('path')
const e = require('express')
const req = require('express/lib/request')

const pool = mysql.createPool({
    host: '184.168.117.92',
    user: 'userCreation',
    password: 'Vp6f}9)U?u)r',
    database: 'PEST',
    multipleStatements: true,
    dateStrings: true
})

const port = process.env.PORT || 3001

pool.query(`SELECT 1 + 1 AS solution`, function (error, results, fields) {
    if (error) throw error;
});


app.get('/', function (req, res) {
    res.json({ "name": "Raghul" })
})

app.post('/authenticationByLoginTable', async (req, res) => {


    pool.query(`SELECT * from login where username=? AND password=?`, [req.body.username, req.body.password], function (error, results, fields) {
        if (results.length > 0) {
            let query = `Select WorkTypeID,WorkTypeName from WorkType`
            pool.query(query, function (err, result) {
                if (err) throw err
                if (result.length > 0) {
                    console.log(result)
                    let data = results[0]
                    data['workType'] = result
                    return res.status(200).json(data)
                }
            })

        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})
app.post('/authentication', async (req, res) => {


    var checkInContactPromise = contactLoginCheckPromise(req);
    var checkInStaffPromise = staffLoginCheckPromise(req);
    Promise.all([checkInContactPromise, checkInStaffPromise])
      .then((allData) => {
       
        var contact = allData[0];
        var staff = allData[1];
        if ((contact && contact.length > 0) || (staff && staff.length > 0)) {
          console.log("found contact email and password");
        //   var updateContactTokenPromise = updateContactToken(contact[0]);
        let query = `Select WorkTypeID,WorkTypeName from WorkType`
                pool.query(query, function (err, result) {
                    if (err) throw err
                    if (result.length > 0) {
                        // console.log(result)
                        let data = contact.length > 0 ? contact[0] : staff[0];
                        var newData = {
                            workType: result,
                            username: contact.length > 0 ? contact[0].Email1 : staff[0].Email,
                            isStaff: contact.length > 0 ? false : true,
                            userId: contact.length > 0 ? contact[0].ContactID : staff[0].StaffID
                        }
                        data['workType'] = result
                        return res.status(200).json(newData)
                    }
                })
        
        }  else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }       
        
      })
      .catch((err) => {
        return res.status(401).json({ "code": 401, "message": "unauthorized user" })
      });

})

function contactLoginCheckPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `select * from Contact WHERE Contact.Email1 = '${req.body.email}' and PasswordHash = '${req.body.password}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
}
function staffLoginCheckPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `select * from Staff WHERE Staff.Email = '${req.body.email}' and PasswordHash = '${req.body.password}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
}

/* Site API to create ,update and inssert and delete */

app.get('/site', async (req, res) => {
    pool.query(`SELECT SiteName, Address1,SiteType.Description AS SiteType ,SiteZone.Description AS SiteZone,IsNFCAvailable,PostCode,Site.* FROM Site
    JOIN SiteType ON SiteType.SiteTypeID = Site.SiteTypeID
    JOIN SiteZone ON SiteZone.SiteZoneID = Site.SiteZoneID
    ORDER BY SiteName`, function (error, results, fields) {
        if (error) throw error;

        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

app.post('/site', multer.single('file'), async (req, res) => {

    const buffer = Buffer.from(req.body["SiteMapImageURL"], 'base64')
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    const blob = bucket.file("konnect" + id + ".jpg");
    const blobStream = blob.createWriteStream();

    blobStream.on('error', err => {
        next(err);
    });

    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        let query = 'INSERT INTO Site(`SiteID`, `SiteName`, `SiteStatus`, `Address1`, `Address2`, `IsNFCAvailable`, `PostCode`, `SiteZoneID`, `SiteTypeID`,`SiteMapImageURL`,`SiteImageFileName`,`AddedByUserID`,`AddedDateTime`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)'
        let parameters = ["", req.body.SiteName, req.body.SiteStatus, req.body.Address1, req.body.Address2, req.body.IsNFCAvailable, req.body.PostCode, req.body.SiteZoneID, req.body.SiteTypeID, publicUrl, req.body.SiteImageFileName, req.body.AddedByUserID, req.body.AddedDateTime]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err
            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "site data not update" })
            }
        })
    })
    blobStream.end(buffer);
})

app.put('/site', async (req, res) => {

    const detail = req.body

    if (detail['SiteMapImageURL']) {

        const buffer = Buffer.from(detail["SiteMapImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });
        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            detail['SiteMapImageURL'] = publicUrl

            let query = `Update Site SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where SiteID = ?"
            const parameters = [...Object.values(detail), req.query.SiteID]
            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "success" })
                } else {
                    return res.status(401).json({ code: 401, "message": "site with images data not update" })
                }
            })
        })
        blobStream.end(buffer);

    } else {

        let query = `Update Site SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where SiteID = ?"
        const parameters = [...Object.values(detail), req.query.SiteID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err

            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "site without data not update" })
            }
        })
    }

})

app.delete('/site', async (req, res) => {
    let query = `DELETE FROM Site WHERE SiteID =${req.query.SiteID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

//particular site details by using siteZoneId
app.get('/sitename', async (req, res) => {

    const id = parseInt(req.query.SiteZoneID)
    pool.query(`select * from Site where SiteZoneID = ${id}`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

//sitezone to insert and delete and read 
app.get('/sitezone', async (req, res) => {
    pool.query(`select * from SiteZone`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})
app.put('/sitezone', async (req, res) => {
    let detail = req.body;
    let query = `Update SiteZone SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where SiteZoneID = ?"
    const parameters = [...Object.values(detail), req.query.SiteZoneID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err

        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ code: 401, "message": "sitezone without data not update" })
        }
    })
})

app.post('/sitezone', async (req, res) => {
    let query = "INSERT INTO `SiteZone`(`SiteZoneID`, `Description`, `SiteZoneStatus`, `AddedByUserID`, `AddedDateTime`) VALUES (?,?,?,?,?)"
    let parameters = ["", req.body.Description, req.body.SiteZoneStatus, req.body.AddedByUserID, req.body.AddedDateTime]
    pool.query(query, parameters, function (error, results) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ code: 401, "message": "siteZone data not update" })
        }
    })
})

app.delete('/sitezone', async (req, res) => {

    let query = `DELETE FROM SiteZone WHERE SiteZoneID = ${req.query.SiteZoneID} `
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})


/* Access control get*/
app.get('/accesscontrol', async (req, res) => {
    let query = "select * from AccessControl"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "Invalid" })
        }
    })
})

/* point details api to list pointDetails and add points details  ,update and delete */

app.get('/pointdetails', async (req, res) => {
    const zoneId = parseInt(req.query.SiteZoneID)
    const siteId = parseInt(req.query.siteId)
    pool.query(`select * from Point_Details where SiteZoneID = ${zoneId} AND SiteID= ${siteId}`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

app.post('/pointdetails', async (req, res, next) => {

    let uid;
    console.log(req.body.UID)
    let query = `select Count(*) from Point_Details where UID = '${req.body.UID}'`
    pool.query(query, function (err, results) {
        if (err) throw err

        if (results[0]['Count(*)'] >= 2) {
            return res.status(400).json({ code: 400, message: "UID already exists" })
        } else {
            const buffer = Buffer.from(req.body["PointImageURL"], 'base64')
            // Create a new blob in the bucket and upload the file data.
            const id = uuid.v4();
            const blob = bucket.file("konnect" + id + ".jpg");
            const blobStream = blob.createWriteStream();

            blobStream.on('error', err => {
                next(err);
            });

            blobStream.on('finish', () => {
                // The public URL can be used to directly access the file via HTTP.
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                let query = 'insert into Point_Details Values (?,?,?,?,?,?,?,?,?,?,?,?)';
                let parameters = ["", req.body.SiteZoneID, req.body.SiteID, req.body.PointNumber, req.body.PointNotes, req.body['UID'], req.body.IsScanned, publicUrl, req.body.AddedUserID, req.body.ScanDateTime, req.body.scanSessionOne, req.body.scanSessionTwo]
                pool.query(query, parameters, function (err, result) {
                    if (err) throw err
                    if (result.affectedRows > 0) {
                        return res.status(200).send({ code: 200, message: "Image Uploaded SuccessFUlly" })
                    } else {
                        return res.status(400).send({ code: 400, message: "data is not valid" })
                    }

                });

            });
            blobStream.end(buffer);

        }
    })


});

// app.post('/pointdetails', async (req, res) => {

//     pool.query(`insert into Point_Details Values (?,?,?,?,?,?,?,?,?,?,?)`, ["", req.body.SiteZoneID, req.body.SiteID, req.body.PointNumber, req.body.PointNotes, req.body['UID'], req.body.IsScanned, req.body.PointImage, req.body.MapImage, req.body.AddedUserID, req.body.ScanDateTime], function (error, result, fields) {
//         if (error) throw error;
//         if (result.affectedRows > 0) {
//             return res.status(200).json({ code: 200, message: "success" })
//         } else {
//             return res.status(401).json({ code: 401, "message": "unauthorized user" })
//         }

//     })
// })

app.get('/pointdetailsreport', async (req, res) => {
    let query = `Select Scan_Details.ScanID,Scan_Details.PointID,SiteZone.Description,Site.SiteName,Point_Details.PointNumber, login.username,Scan_Details.ScanDateTime
    from Scan_Details 
    JOIN Point_Details ON Point_Details.PointID = Scan_Details.PointID
    JOIN Site ON Site.SiteID = Point_Details.SiteID
    JOIN SiteZone ON SiteZone.SiteZoneID = Point_Details.SiteZoneID
    JOIN login ON login.UserID = Scan_Details.UserID`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        return res.status(200).json(results)
    })
})

app.put('/pointdetails', async (req, res, next) => {
    const detail = req.body

    if (detail['PointImageURL']) {

        const buffer = Buffer.from(detail["PointImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });
        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            detail['PointImageURL'] = publicUrl

            let query = `Update Point_Details SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where PointID = ?"
            const parameters = [...Object.values(detail), req.query.PointID]

            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "success" })
                } else {
                    return res.status(401).json({ code: 400, "message": "pointDetails with images data not update" })
                }
            })
        })
        blobStream.end(buffer);

    } else {
        let query = `Update Point_Details SET  ` + Object.keys(req.body).map(key => `${key}=?`).join(",") + " where PointID = ?"
        const parameters = [...Object.values(req.body), req.query.PointID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err
            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "pointDetails without images data not update" })
            }
        })
    }

})

app.delete('/pointdetails', async (req, res) => {
    let scanDetailsquery = `DELETE FROM Scan_Details WHERE PointID = ${req.query.PointID}`

    pool.query(scanDetailsquery, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            let query = `DELETE FROM Point_Details WHERE PointID =${req.query.PointID}`
            pool.query(query, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "deleted successfully" })
                } else {
                    return res.status(400).json({ code: 400, message: "Point_details deleted successfully" })
                }
            })

        } else {
            let query = `DELETE FROM Point_Details WHERE PointID =${req.query.PointID}`
            pool.query(query, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "deleted successfully" })
                } else {
                    return res.status(400).json({ code: 400, message: "Point_details deleted successfully" })
                }
            })
            // return res.status(400).json({ "code": 400, "message": "not deleted scan details" })
        }
    })
})

/* contact API to create,update and insert*/

app.get('/contact', async (req, res) => {

    pool.query(`SELECT Contact.*,Company.CompanyID,Company.CompanyName,Company.BillingAddress1,Company.BillingAddress2,Company.BillingPostCode from Contact 
    JOIN Company ON Company.CompanyID = Contact.CompanyID`, function (error, listContacts, fields) {
        if (error) throw error;
        if (listContacts.length > 0) {
            // let query = `SELECT Contact_Site.ContactID,Site.SiteName FROM Contact_Site JOIN Site ON Site.SiteID = Contact_Site.SiteID WHERE ContactID = Contact_Site.ContactID`
            // pool.query(query, function (err, results) {
            //     if (err) throw err
            //     if (results.length > 0) {
            //         for (let contact of listContacts) {
            //             let siteName = results.map((e) => {
            //                 if (e.ContactID.includes(contact.ContactID)) {
            //                    console.log( e.siteName
            //                 }
            //             })
            //         }

            //     }
            // })
            // return res.status(200).json(listContacts)


            return res.status(200).json(listContacts)



        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

app.post('/contact', async (req, res) => {
    pool.query(`insert into Contact(ContactID, SalutationID,ContactName, ContactTypeID, AccessControlID, Email1, Email2, CompanyID,Mobile, Telephone,AddedByUserID, AddedDateTime) Values (?,?,?,?,?,?,?,?,?,?,?,?)`, ["", req.body.SalutationID, req.body.ContactName, req.body.ContactTypeID, req.body.AccessControlID, req.body.Email1, req.body.Email2, req.body.CompanyID, req.body.Mobile, req.body.Telephone, req.body.AddedByUserID, req.body.AddedDateTime], function (error, result, fields) {
        if (error) throw error;
        if (result.affectedRows > 0) {

            console.log(result)
            if (req.body.LinkedSites.length > 0) {
                let values = [];

                for (let data of req.body['LinkedSites']) {
                    let value = []
                    value.push(result.insertId)
                    value.push(data.SiteID)
                    value.push(data.AddedByUserID)
                    value.push(data.AddedDateTime)
                    values.push(value)
                }

                var sql = "INSERT INTO Contact_Site (ContactID, SiteID, AddedByUserID, AddedDateTime) VALUES ?";

                pool.query(sql, [values], function (err, result) {
                    if (err) throw err;
                    if (result.affectedRows > 0) {
                        return res.status(200).json({ code: 200, message: "success" })
                        
                    }
                    else {
                        return res.status(401).json({ code: 401, "message": "contact data not inserted" })
                    }
                });


            }    

        } else {
            return res.status(400).json({ code: 400, message: "data is missing" })
        }

    })
})

app.put('/contact', async (req, res) => {
    let contactSiteValues = req.body.LinkedSites
    let contactObjects = req.body
    delete contactObjects['LinkedSites']
    let query = `Update Contact SET  ` + Object.keys(req.body).map(key => `${key}=?`).join(",") + " where ContactID = ?"
    const parameters = [...Object.values(contactObjects), req.body.ContactID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err
        if (results.affectedRows > 0) {

            if (contactSiteValues.length > 0) {

                let query = `DELETE FROM Contact_Site WHERE ContactID =${req.body.ContactID}`
                pool.query(query, function (error, results, fields) {
                    if (error) throw error

                    //if (results.affectedRows > 0) {

                    let values = [];
                    for (let data of contactSiteValues) {
                        let value = []
                        let date = new Date(data.AddedDateTime)
                        value.push(contactObjects.ContactID)
                        value.push(data.SiteID)
                        value.push(data.AddedByUserID)
                        value.push(date)
                        values.push(value)
                    }

                    if (values.length > 0) {
                        var sql = "INSERT INTO Contact_Site (ContactID, SiteID, AddedByUserID, AddedDateTime) VALUES ?";

                        pool.query(sql, [values], function (err, result) {
                            if (err) throw err;
                            if (result.affectedRows > 0) {
                                return res.status(200).json({ code: 200, message: "success" })
                            }
                            else {
                                return res.status(401).json({ code: 401, "message": "contact data not updated" })
                            }
                        });
                    }
                    else
                        return res.status(200).json({ code: 200, message: "success" })
                    /*} else {
                        return res.status(401).json({ "code": 401, "message": "unauthorized user" })
                    }*/
                })
                //return res.status(200).json({ code: 200, message: "success" })
            }
            else {
                let query = `DELETE FROM Contact_Site WHERE ContactID =${req.body.ContactID}`
                pool.query(query, function (error, results, fields) {
                    if (error) throw error
                    return res.status(200).json({ code: 200, message: "Deleted contact sites." })
                })
            }

        } else {
            return res.status(401).json({ code: 401, "message": "contact data not update" })
        }
    })
})

app.delete('/contact', async (req, res) => {
    let query = `DELETE FROM Contact WHERE ContactID =${req.query.ContactID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

/* staff API to create,update and insert  */

app.get('/staff', async (req, res) => {

    pool.query(`SELECT Staff.*,AccessControl.AccessControl,StaffTitle.StaffTitle,StaffEmploymentStatus.StaffEmploymentStatus AS EmploymentStatus
    FROM Staff 
        JOIN AccessControl ON AccessControl.AccessControlID = Staff.AccessControlID
        JOIN StaffTitle ON StaffTitle.StaffTitleID = Staff.StaffTitleID
        JOIN StaffEmploymentStatus ON StaffEmploymentStatus.StaffEmploymentStatusID = Staff.StaffEmploymentStatusID
        ORDER BY Staff.StaffID`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {

            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

app.post('/staff', multer.single('file'), async (req, res, next) => {

    const buffer = Buffer.from(req.body["StaffImageURL"], 'base64')
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    //console.log(string.indexOf(req.body["StaffImageFileName"]))
    const blob = bucket.file("konnect" + id + "." + req.body['StaffImageFileName'].split('.').pop());
    const blobStream = blob.createWriteStream();

    blobStream.on('error', err => {
        next(err);
    });
    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        let query = `INSERT INTO Staff(StaffID, StaffName, GenderID,SalutationID,StaffTitleID, StaffImageURL, StaffImageFileName, Email, StaffEmploymentType, StaffEmploymentStatusID,Mobile,Telephone,Address1, Address2, PostCode, Nationality, JobStartDate, JobEndDate,IDTypeID, ID, Department,Passport, NextOfKin, NextOfKinMobile, RelationshipID, DOB, MartialStatusID,HighestQualification, Religion,PasswordHash, PassToken, AccessControlID,AddedByUserID, AddedDateTime) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        pool.query(query, ["", req.body.StaffName, req.body.GenderID, req.body.SalutationID, req.body.StaffTitleID, publicUrl, req.body.StaffImageFileName, req.body.Email, req.body.StaffEmploymentType, req.body.StaffEmploymentStatusID, req.body.Mobile, req.body.Telephone, req.body.Address1, req.body.Address2, req.body.PostCode, req.body.Nationality, req.body.JobStartDate, req.body.JobEndDate, req.body.IDTypeID, req.body.ID, req.body.Department, req.body.Passport, req.body.NextOfKin, req.body.NextOfKinMobile, req.body.RelationshipID, req.body.DOB, req.body.MartialStatusID, req.body.HighestQualification, req.body.Religion, req.body.PasswordHash,"", req.body.AccessControlID, req.body.AddedByUserID, req.body.AddedDateTime], function (error, results, fields) {
            if (error) return res.send(error);
            if (results.affectedRows > 0) {

                for (let certificateDetail of req.body.CertificateDetails) {
                    const buffer1 = Buffer.from(certificateDetail["CertificateImageURL"], 'base64')
                    // Create a new blob in the bucket and upload the file data.
                    const id1 = uuid.v4();
                    const blob1 = bucket.file("konnect" + id1 + "." + certificateDetail['CertFileName'].split('.').pop());
                    const blobStream1 = blob1.createWriteStream();
                    blobStream1.on('error', err => {
                        next(err);
                    });
                    blobStream1.on('finish', () => {
                        const publicUrl1 = format(`https://storage.googleapis.com/${bucket.name}/${blob1.name}`);
                        var sql = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,CertificateImageURL,AddedByUserID,AddedDateTime,CertFileName) VALUES (?,?,?,?,?,?,?,?,?,?)";

                        pool.query(sql, ["", results.insertId, certificateDetail.CertTypeID, certificateDetail.CertBodyID, certificateDetail.ValidityStartDate, certificateDetail.ValidityEndDate, publicUrl1, certificateDetail.AddedByUserID, certificateDetail.AddedDateTime, certificateDetail.CertFileName], function (err, result) {
                            if (err) throw err;
                            if (result.affectedRows > 0) {

                                console.log(result)
                                //  return res.status(200).json({ code: 200, message: "Success." })
                            }
                            else {
                                console.log("oopsss!!!!!!!!!!!")
                                //  return res.status(401).json({ code: 401, "message": "Data not inserted." })
                            }
                        });
                    });
                    blobStream1.end(buffer1);
                }



            } else {
                return res.status(401).json({ code: 401, "message": "Data not inserted." })
            }

            return res.status(200).json({ code: 200, message: "Multiple Data is inserted" })
        })
    })
    blobStream.end(buffer);
})

// app.put('/staff', async (req, res) => {

//     const detail = req.body
//     if (detail['CertificateDetails']) {
//         delete detail['CertificateDetails']
//     }


//     let values = [];
//     values.push(req.body.CertTypeID)
//     values.push(req.body.CertBodyID)
//     values.push(req.body.ValidityStartDate)
//     values.push(req.body.ValidityEndDate)
//     values.push(req.body.CertificateImageURL)

//     const staffObjects = req.body
//     delete staffObjects['CertTypeID']
//     delete staffObjects['CertBodyID']
//     delete staffObjects['ValidityStartDate']
//     delete staffObjects['ValidityEndDate']
//     delete staffObjects['CertificateImageURL']
//     if (detail['StaffImageURL']) {

//         const buffer = Buffer.from(detail["StaffImageURL"], 'base64')
//         // Create a new blob in the bucket and upload the file data.
//         const id = uuid.v4();
//         const blob = bucket.file("konnect" + id + ".jpg");
//         const blobStream = blob.createWriteStream();

//         blobStream.on('error', err => {
//             next(err);
//         });

//         blobStream.on('finish', () => {
//             const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
//             detail['StaffImageURL'] = publicUrl
//             let query = `Update Staff SET  ` + Object.keys(staffObjects).map(key => `${key}=?`).join(",") + " where StaffID = ?"
//             const parameters = [...Object.values(staffObjects), req.body.StaffID]
//             pool.query(query, parameters, function (err, results, fields) {
//                 if (err) throw err
//                 if (results.affectedRows > 0) {

//                     let query = `DELETE FROM Staff_Certificate WHERE StaffID =${req.body.StaffID}`
//                     pool.query(query, function (error, results, fields) {
//                         if (error) throw error
//                     })
//                     if ((values[0] !== null) || (values[1] !== null) || (values[2] !== null) || (values[3] !== null) || (values[4] !== null)) {
//                         const buffer1 = Buffer.from(values[4], 'base64')
//                         // Create a new blob in the bucket and upload the file data.
//                         const id1 = uuid.v4();
//                         const blob1 = bucket.file("konnect" + id1 + ".jpg");
//                         const blobStream1 = blob1.createWriteStream();
//                         blobStream1.on('error', err => {
//                             next(err);
//                         });
//                         blobStream1.on('finish', () => {
//                             const publicUrl1 = format(`https://storage.googleapis.com/${bucket.name}/${blob1.name}`);
//                             var sql = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,CertificateImageURL,AddedByUserID,AddedDateTime) VALUES (?,?,?,?,?,?,?,?,?)";

//                             pool.query(sql, ["", req.body.StaffID, values[0], values[1], values[2], values[3], publicUrl1, req.body.AddedByUserID, req.body.AddedDateTime], function (err, result) {
//                                 if (err) throw err;
//                                 if (result.affectedRows > 0) {
//                                     return res.status(200).json({ code: 200, message: "Success." })
//                                 }
//                                 else {
//                                     return res.status(401).json({ code: 401, "message": "Data not inserted." })
//                                 }
//                             });
//                         });
//                         blobStream1.end(buffer1);
//                     }



//                 } else {
//                     return res.status(401).json({ code: 401, "message": "data not update" })
//                 }
//             })
//         })
//         blobStream.end(buffer);

//     } else {

//         let query = `Update Staff SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where StaffID = ?"
//         const parameters = [...Object.values(detail), req.query.StaffID]
//         pool.query(query, parameters, function (err, results, fields) {
//             if (err) throw err

//             if (results.affectedRows > 0) {
//                 return res.status(200).json({ code: 200, message: "success" })
//             } else {
//                 return res.status(401).json({ code: 401, "message": "data not update" })
//             }
//         })
//     }

// })

app.put('/staff', async (req, res, next) => {
    const certificates = req.body.CertificateDetails
    const detail = req.body

    if (detail['CertificateDetails']) {
        delete detail['CertificateDetails']
    }

    if (detail['StaffImageURL']) {
        const buffer = Buffer.from(detail["StaffImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + "." + detail['StaffImageFileName'].split('.').pop());
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });

        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            detail['StaffImageURL'] = publicUrl
            let query = `Update Staff SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where StaffID = ?"
            const parameters = [...Object.values(detail), req.body.StaffID]

            pool.query(query, parameters, function (err, results) {
                if (err) throw err
                //console.log(results)
                if (results.affectedRows > 0) {
                    //console.log(results)
                    if (certificates.length > 0) {

                        let query = `DELETE FROM Staff_Certificate WHERE StaffID =${req.body.StaffID}`
                        pool.query(query, function (error, results, fields) {
                            if (error) throw error
                        })

                        for (let certficate of certificates) {
                            if (certficate['CertificateImageURL']) {
                                const buffer1 = Buffer.from(certficate['CertificateImageURL'], 'base64')
                                // Create a new blob in the bucket and upload the file data.
                                const id1 = uuid.v4();
                                const blob1 = bucket.file("konnect" + id1 + "." + certficate['CertFileName'].split('.').pop());
                                const blobStream1 = blob1.createWriteStream();
                                blobStream1.on('error', err => {
                                    next(err);
                                });
                                blobStream1.on('finish', () => {
                                    const publicUrl1 = format(`https://storage.googleapis.com/${bucket.name}/${blob1.name}`);
                                    let query = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,CertificateImageURL,AddedByUserID,AddedDateTime,CertFileName) VALUES (?,?,?,?,?,?,?,?,?,?)";
                                    let parameters = ["", req.body.StaffID, certficate.CertTypeID, certficate.CertBodyID, certficate.ValidityStartDate, certficate.ValidityEndDate, publicUrl1, certficate.AddedByUserID, certficate.AddedDateTime, certficate.CertFileName]
                                    pool.query(query, parameters, function (err, results) {
                                        if (err) throw err

                                        if (results.affectedRows > 0) {
                                            console.log(results)

                                        } else {
                                            return res.status(400).json({ code: 400, message: "Staff certificate values has some error" })
                                        }

                                    })

                                })
                                blobStream1.end(buffer1)
                            }
                        }
                        return res.status(200).json({ code: 200, message: "Staff certificate values updated." })
                    } else {
                        let query = `DELETE FROM Staff_Certificate WHERE StaffID =${req.body.StaffID}`
                        pool.query(query, function (error, results, fields) {
                            if (error) throw error
                            return res.status(200).json({ code: 200, message: "Deleted contact sites." })
                        })
                    }
                } else {
                    return res.status(400).json({ code: 400, message: "staff data is not updated" })
                }
            })

        })
        blobStream.end(buffer);
    } else {

        let query = `Update Staff SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where StaffID = ?"
        const parameters = [...Object.values(detail), req.body.StaffID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err
            if (results.affectedRows > 0) {
                let result = 0;
                if (certificates.length > 0) {
                    let query = `DELETE FROM Staff_Certificate WHERE StaffID =${req.body.StaffID}`
                    pool.query(query, function (error, results, fields) {
                        if (error) throw error
                    })

                    for (let certficate of certificates) {
                        if (certficate['CertificateImageURL']) {
                            const buffer1 = Buffer.from(certficate['CertificateImageURL'], 'base64')
                            // Create a new blob in the bucket and upload the file data.
                            const id1 = uuid.v4();
                            const blob1 = bucket.file("konnect" + id1 + "." + certficate['CertFileName'].split('.').pop())
                            const blobStream1 = blob1.createWriteStream();
                            blobStream1.on('error', err => {
                                next(err);
                            });
                            blobStream1.on('finish', () => {
                                const publicUrl1 = format(`https://storage.googleapis.com/${bucket.name}/${blob1.name}`);
                                let query = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,CertificateImageURL,AddedByUserID,AddedDateTime,CertFileName) VALUES (?,?,?,?,?,?,?,?,?,?)";
                                let parameters = ["", req.body.StaffID, certficate.CertTypeID, certficate.CertBodyID, certficate.ValidityStartDate, certficate.ValidityEndDate, publicUrl1, certficate.AddedByUserID, certficate.AddedDateTime, certficate.CertFileName]
                                pool.query(query, parameters, function (err, results) {
                                    if (err) throw err

                                    if (results.affectedRows > 0) {
                                        result = results.affectedRows

                                    } else {
                                        return res.status(400).json({ code: 400, message: "Staff certificate values has some error" })
                                    }

                                    /*if (result > 0) {
                                        return res.status(200).json({ code: 200, message: "staff certificate values updated" })
                                    }*/

                                })

                            })
                            blobStream1.end(buffer1)
                        } else {
                            let query = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,AddedByUserID,AddedDateTime,CertFileName) VALUES (?,?,?,?,?,?,?,?,?)";
                            let parameters = ["", req.body.StaffID, certficate.CertTypeID, certficate.CertBodyID, certficate.ValidityStartDate, certficate.ValidityEndDate, certficate.AddedByUserID, certficate.AddedDateTime, certficate.CertFileName]
                            pool.query(query, parameters, function (err, results) {
                                if (err) throw err

                                if (results.affectedRows > 0) {
                                    console.log(results)

                                } else {
                                    return res.status(400).json({ code: 400, message: "Staff certificate values has some error" })
                                }

                            })
                        }
                    }
                } else {
                    let query = `DELETE FROM Staff_Certificate WHERE StaffID =${req.body.StaffID}`
                    pool.query(query, function (error, results, fields) {
                        if (error) throw error
                        return res.status(200).json({ code: 200, message: "Deleted contact sites." })
                    })
                }

                return res.status(200).json({ code: 200, message: "staff data updated" })

            } else {
                return res.status(401).json({ code: 401, "message": "staff data not update" })
            }
        })
    }

})

app.delete('/staff', async (req, res) => {
    let query = `DELETE FROM Staff WHERE StaffID =${req.query.StaffID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

/*Staff Certificate Type get,post,delete and put*/

app.get('/certificatetype', async (req, res) => {
    pool.query(`select * from CertificateType`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "No Data Available." })
        }
    })

})

app.post('/certificatetype', async (req, res) => {
    let query = `INSERT INTO CertificateType (CertTypeID,CertTypeName, AddedByUserID, AddedDateTime) VALUES (?,?,?,?)`
    let parameters = ["", req.body.CertTypeName, req.body.AddedByUserID, req.body.AddedDateTime]
    pool.query(query, parameters, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "Inserted successfully." })
        } else {
            return res.status(401).json({ "code": 401, "message": "Not inserted." })
        }

    })
})

app.delete('/certificatetype', async (req, res) => {

    let query = `DELETE FROM CertificateType WHERE CertTypeID =${req.query.CertTypeID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "Deleted successfully." })
        } else {
            return res.status(401).json({ "code": 401, "message": "Delete unsuccessful." })
        }
    })

})

app.put('/certificatetype', async (req, res) => {
    let query = `Update CertificateType SET CertTypeName = '${req.body.CertTypeName}' where CertTypeID = ${req.body.CertTypeID}`
    /*const parameters = [...Object.values(req.body.CertTypeName),req.body.CertTypeID]*/
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, "message": "Update Successful." })
        } else {
            return res.status(401).json({ code: 401, "message": "certificate type Data not updated." })
        }
    })
})


/*Staff Certificate Body get,post,delete and put*/

app.get('/certificatebody', async (req, res) => {
    pool.query(`select * from CertificateBody`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "No Data Available." })
        }
    })

})

app.post('/certificatebody', async (req, res) => {
    let query = `INSERT INTO CertificateBody (CertBodyID,CertBodyName, AddedByUserID, AddedDateTime) VALUES (?,?,?,?)`
    let parameters = ["", req.body.CertBodyName, req.body.AddedByUserID, req.body.AddedDateTime]
    pool.query(query, parameters, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "Inserted successfully." })
        } else {
            return res.status(401).json({ "code": 401, "message": "Not inserted." })
        }

    })
})

app.delete('/certificatebody', async (req, res) => {

    let query = `DELETE FROM CertificateBody WHERE CertBodyID =${req.query.CertBodyID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "Deleted successfully." })
        } else {
            return res.status(401).json({ "code": 401, "message": "Delete unsuccessful." })
        }
    })

})

app.put('/certificatebody', async (req, res) => {
    let query = `Update CertificateBody SET CertBodyName = '${req.body.CertBodyName}' where CertBodyID = ${req.body.CertBodyID}`
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, "message": "Update Successful." })
        } else {
            return res.status(401).json({ code: 401, "message": " certificatebody Data not updated." })
        }
    })
})

/*scandetails GET_POST*/

app.get('/checkscanid', async (req, res) => {

    const uid = req.query.UID
    const userID = parseInt(req.query.userID)

    pool.query(`select * from Point_Details where UID = '${uid}'`, function (error, results, fields) {
        if (error) throw error
        if (results.length > 0) {
            let pointId = results[0].PointID
            pool.query(`select * from Scan_Details where UID ='${uid}' AND UserID = ${userID} AND PointID = ${pointId} AND DATE(ScanDateTime) = DATE('${req.query.ScanDateTime}')`, function (err, results, fields) {
                if (err) throw err
                console.log(results)
                if (results.length > 0) {
                    console.log(results)
                    let query = `Update Scan_Details SET ScanDateTime = '${req.query.ScanDateTime}' where UID ='${uid}' AND UserID = ${userID} AND PointID = ${pointId} AND DATE(ScanDateTime) = DATE('${req.query.ScanDateTime}')`
                    // let query = `Update Scan_Details SET  ` + Object.keys(req.query).map(key => `${key}=?`).join(",") + " where UID = ?"
                    const parameters = [...Object.values(req.query), req.query.UID]
                    pool.query(query, parameters, function (err, results, fields) {
                        if (err) throw err
                        if (results.affectedRows > 0) {
                            let query = `Update Point_Details SET ScanDateTime = '${req.query.ScanDateTime}' where PointID = ${pointId}`
                            pool.query(query, function (err, results) {
                                if (err) throw err
                                if (results.affectedRows > 0) {
                                    return res.status(200).json({ code: 200, message: "success" })
                                } else {
                                    return res.status(400).json({ code: 400, message: "point details not update" })
                                }
                            })

                        } else {
                            return res.status(400).json({ code: 400, "message": "checkscanid data not update" })
                        }
                    })
                    // else {
                    //     let query = `INSERT INTO Scan_Details( UID, PointID, UserID, ScanDateTime) VALUES (?,?,?,?)`
                    //     let parameters = [uid, pointId, userID, req.query.ScanDateTime]
                    //     pool.query(query, parameters, function (err, results) {
                    //         if (err) throw err
                    //         if (results.affectedRows > 0) {
                    //             pool.query(query, parameters, function (err, results) {
                    //                 if (err) throw err
                    //                 if (results.affectedRows > 0) {
                    //                     let query = `Update Point_Details SET scanSessionTwo = '${req.query.ScanDateTime}' where PointID = ${pointId}`
                    //                     pool.query(query, function (err, results) {
                    //                         if (err) throw err
                    //                         if (results.affectedRows > 0) {
                    //                             return res.status(200).json({ code: 200, message: "success" })
                    //                         } else {
                    //                             return res.status(400).json({ code: 400, message: "point details not update" })
                    //                         }
                    //                     })
                    //                 } else {
                    //                     return res.status(400).json({ code: 400, message: "Invalid NFC tag" })
                    //                 }
                    //             })
                    //         } else {
                    //             return res.status(400).json({ code: 400, message: "Invalid NFC tag" })
                    //         }
                    //     })
                    // }
                }
                // else if (results.length > 0 && results.length >= 2) {

                //     if (new Date(req.query.ScanDateTime).getDate() > new Date(results[1].ScanDateTime).getDate()) {
                //         return res.status(400).json({ code: 400, message: "invalid data" })
                //     }
                //     if (new Date(req.query.ScanDateTime).getTime() >= new Date(results[1].ScanDateTime)) {
                //         let query = `Update Scan_Details SET  ` + Object.keys(req.query).map(key => `${key}=?`).join(",") + " where ScanID = ?"
                //         const parameters = [...Object.values(req.query), results[1].ScanID]
                //         pool.query(query, parameters, function (err, results, fields) {
                //             if (err) throw err

                //             if (results.affectedRows > 0) {
                //                 return res.status(200).json({ code: 200, message: "success" })
                //             } else {
                //                 return res.status(400).json({ code: 400, "message": "invalid data" })
                //             }
                //         })
                //     }

                // }
                else {

                    let query = `INSERT INTO Scan_Details( UID, PointID, UserID, ScanDateTime) VALUES (?,?,?,?)`
                    let parameters = [uid, pointId, userID, req.query.ScanDateTime]
                    pool.query(query, parameters, function (err, results) {
                        if (err) throw err
                        if (results.affectedRows > 0) {
                            console.log(pointId)
                            let query = `Update Point_Details SET ScanDateTime = '${req.query.ScanDateTime}' where PointID = ${pointId}`
                            pool.query(query, function (err, results) {
                                if (err) throw err
                                if (results.affectedRows > 0) {
                                    return res.status(200).json({ code: 200, message: "success" })
                                } else {
                                    return res.status(400).json({ code: 400, message: "point details not update" })
                                }
                            })
                        } else {
                            return res.status(400).json({ code: 400, message: "Invalid NFC Tag" })
                        }
                    })
                }
            })
        } else {
            return res.status(400).json({ code: 400, message: "Invalid Access" })
        }
    })
    // let query = `update Point_Details SET IsScanned = "1" where UID = '${uid}'`

    // pool.query(query, function (error, results, fields) {
    //     if (error) throw error;
    //     if (results.affectedRows > 0) {
    //         pool.query(`select * from Point_Details where UID = '${uid}'`, function (error, results, fields) {
    //             if (results.length > 0) {
    //                 let pointID = results[0].PointID
    //                 let query = `INSERT INTO Scan_Details(ScanID, UID, PointID, UserID, ScanDateTime) VALUES (?,?,?,?,?)`
    //                 let parameters = ["", uid, pointID, userID, req.body.ScanDateTime]
    //                 pool.query(query, parameters, function (err, results) {
    //                     if (err) throw err
    //                     if (results.affectedRows > 0) {
    //                         return res.status(200).json({ code: 200, message: "success" })
    //                     } else {
    //                         return res.status(400).json({ code: 400, message: "Invalid Data" })
    //                     }
    //                 })
    //             } else {
    //                 let query = `INSERT INTO Scan_Details(ScanID, UID, PointID, UserID, ScanDateTime) VALUES (?,?,?,?,?)`
    //                 let parameters = ["", uid, pointID, userID, req.body.ScanDateTime]
    //                 pool.query(query, parameters, function (err, results) {
    //                     if (err) throw err
    //                     if (results.affectedRows > 0) {
    //                         return res.status(200).json({ code: 200, message: "success" })
    //                     } else {
    //                         return res.status(400).json({ code: 400, message: "Invalid Data" })
    //                     }
    //                 })

    //             }
    //         })


    //     } else {
    //         return res.status(401).json({ "code": 401, "message": "Invalid NFC ID." })
    //     }
    // })

})

app.post('/scandetails', async (req, res) => {
    //const currentDate = new DATE();
    let query = `INSERT INTO Scan_Details(ScanID, UID, PointID, UserID, ScanDateTime) VALUES (?,?,?,?,?)`
    let parameters = ["", req.body.UID, req.body.PointID, req.body.UserID, req.body.ScanDateTime]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, "message": "Success" })
        } else {
            return res.status(401).json({ code: 401, "message": "unauthorized user" })
        }

    })

})

app.delete('/scandetails', async (req, res) => {

    let query = `DELETE FROM Scan_Details WHERE PointID =${req.query.PointID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

/*Contact site API to create and delete only*/

app.get('/contactsite', async (req, res) => {
    const ContactID = parseInt(req.query.ContactID)
    pool.query(`select * from Contact_Site where ContactID = ${ContactID}`, function (error, results, fields) {
        if (error) throw error;

        return res.status(200).json(results)

    })

})

app.post('/contactsite', async (req, res) => {
    let query = `INSERT INTO Contact_Site (ConSiteID, ContactID, SiteID) VALUES (?,?,?)`
    let parameters = ["", req.body.ContactID, req.body.SiteID]
    pool.query(query, parameters, function (error, results, fields) {
        if (error) throw error
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }

    })
})

app.delete('/contactsite', async (req, res) => {

    let query = `DELETE FROM Contact_Site WHERE ConSiteID =${req.query.ConSiteID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

/*staff certficate Api to create and delete */

app.post('/staffCertificate', multer.single('file'), async (req, res, next) => {


    const buffer = Buffer.from(req.body["CertificateImageURL"], 'base64')
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    const blob = bucket.file("konnect" + id + "." + req.body['CertFileName'].split('.').pop());
    const blobStream = blob.createWriteStream();

    blobStream.on('error', err => {
        next(err);
    });

    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        let query = 'INSERT INTO Staff_Certificate values (?,?,?,?,?,?,?,?,?,?)';
        let parameters = ["", req.body['StaffID'], req.body['CertTypeID'], req.body['CertBodyID'], req.body['ValidityStartDate'], req.body['ValidityEndDate'], publicUrl, req.body['AddedByUserID'], req.body['AddedDateTime'], req.body['CertFileName']]
        pool.query(query, parameters, function (err, result) {
            if (err) throw err
            if (result.affectedRows > 0) {
                return res.status(200).send({ message: "Image Uploaded SuccessFUlly" })
            } else {
                return res.status(200).send({ message: "Image deleted SuccessFUlly" })
            }

        });
    });
    blobStream.end(buffer);

});

app.delete('/staffcertificate', async (req, res) => {

    let query = `DELETE FROM Staff_Certificate WHERE StaffCertID =${req.query.StaffCertID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

app.get('/staffcertificate', async (req, res) => {

    let query = `Select * from Staff_Certificate where StaffID =${req.query.StaffID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(200).json({ "code": 200, "message": "No certificates available." })
        }
    })

})

/*siteType create API to  get, add and delete only*/
app.get('/sitetype', async (req, res) => {
    pool.query(`select * from SiteType`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

app.post('/sitetype', async (req, res) => {
    let query = `INSERT INTO SiteType (SiteTypeID, Description, SiteTypeStatus, AddedByUserID, AddedDateTime) VALUES (?,?,?,?,?)`
    let parameters = ["", req.body.Description, req.body.SiteTypeStatus, req.body.AddedByUserID, req.body.AddedDateTime]
    pool.query(query, parameters, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }

    })
});


app.put('/sitetype', async (req, res) => {
    let detail = req.body;
    let query = `Update SiteType SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where SiteTypeID = ?"
    const parameters = [...Object.values(detail), req.query.SiteTypeID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err

        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ code: 401, "message": "SiteType without data not update" })
        }
    })
})

app.delete('/sitetype', async (req, res) => {
    let query = `DELETE FROM SiteType WHERE SiteTypeId =${req.query.SiteTypeID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

app.get('/contactType', async (req, res) => {

    let query = "select ContactTypeID, ContactType from ContactType"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "Invalid" })
        }
    })
})

app.get('/gender', async (req, res) => {

    let query = "select GenderID,Gender from Gender"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "Invalid" })
        }
    })
})

app.get('/saluation', async (req, res) => {
    let query = "select SalutationID,Salutation from Salutation"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "Invalid" })
        }
    })
})

app.get('/idtype', async (req, res) => {
    let query = "select IDTypeID,IDType from IDType"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "invalid" })
        }
    })

})

app.get('/maritalstatus', async (req, res) => {
    let query = "select MaritalStatusID,MaritalStatus from MaritalStatus"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "invalid" })
        }
    })

})

app.get('/relationship', async (req, res) => {

    let query = "select RelationshipID,	Relationship from Relationship"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "invalid" })
        }
    })

})

app.get('/staffEmploymentStatus', async (req, res) => {

    let query = "select StaffEmploymentStatusID,StaffEmploymentStatus from StaffEmploymentStatus"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "invalid" })
        }
    })

})

app.get('/staffEmploymentType', async (req, res) => {

    let query = "select StaffEmploymentTypeID,	StaffEmploymentType from StaffEmploymentType"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "invalid" })
        }
    })

})

app.get('/staffTitle', async (req, res) => {

    let query = "select StaffTitleID,StaffTitle from StaffTitle"
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "invalid" })
        }
    })

})

app.get('/ecssitename', async (req, res) => {
    let query = `select * from Site where SiteTypeID=${req.query.SiteTypeID} and SiteZoneID =${req.query.SiteZoneID}`
    pool.query(query, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(400).json({ code: 400, "message": "invalid data" })
        }
    })
})

app.get('/ecsreports', async (req, res) => {

    let obj = {}
    let pointQuery = `SELECT Point_Details.PointID,PointNumber FROM Point_Details
    JOIN Site ON Point_Details.SiteID = Site.SiteID
    WHERE Point_Details.SiteID =${req.query.SiteID} AND Point_Details.SiteZoneID=${req.query.SiteZoneID} AND Site.SiteTypeID = ${req.query.SiteTypeID}`

    let query = `Select Scan_Details.*,Point_Details.PointNumber from Scan_Details 
    JOIN Point_Details ON Scan_Details.PointID = Point_Details.PointID
    WHERE Scan_Details.PointID IN (SELECT Point_Details.PointID FROM Point_Details
    JOIN Site ON Point_Details.SiteID = Site.SiteID
    WHERE Point_Details.SiteID = ${req.query.SiteID} AND Point_Details.SiteZoneID=${req.query.SiteZoneID} AND Site.SiteTypeID = ${req.query.SiteTypeID})
    AND MONTH(Scan_Details.ScanDateTime) = MONTH('${req.query.ScanDateTime}') AND YEAR(Scan_Details.ScanDateTime) = YEAR('${req.query.ScanDateTime}')
    ORDER BY Scan_Details.PointID,Scan_Details.ScanDateTime ASC`

    pool.query(query, function (err, results) {

        if (err) throw err
        if (results.length > 0) {

            pool.query(pointQuery, function (err, pointQuery) {
                if (err) throw err
                if (pointQuery.length > 0) {
                    obj['pointsData'] = pointQuery
                    obj['ecsReports'] = results
                    return res.status(200).send(obj)
                } else {
                    return res.status(400).json({ code: 400, message: "Invalid query" })
                }

            })

        } else {
            return res.status(400).json({ code: 400, message: "Invalid query" })
        }

    })

})

selectAllElements = () => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM Contact ', (error, elements) => {
            if (error) {
                return reject(error);
            }
            return resolve(elements);
        });
    });
};

selectSites = (id) => {
    return new Promise((resolve, reject) => {
        pool.query(`SELECT Contact_Site.ContactID,Site.SiteName FROM Contact_Site JOIN Site ON Site.SiteID = Contact_Site.SiteID WHERE ContactID = ${id}`, (error, elements) => {
            if (error) {
                return reject(error);
            }
            return resolve(elements)
        })
    })
}

app.get('/demo', async (req, res) => {
    try {
        let arr = []
        const results = await selectAllElements()
        for (let data of results) {
            let listSite = await selectSites(data.ContactID)
            let siteName = listSite.map((e) => e.SiteName)
            data['linkedSites'] = siteName
            arr.push(data)
        }
        return res.json(arr)
    } catch (e) {
        console.log(e)
    }
})


app.get('/contactsitelist', async (req, res) => {
    let query = `SELECT Contact_Site.ContactID,Site.SiteName FROM Contact_Site JOIN Site ON Site.SiteID = Contact_Site.SiteID WHERE ContactID = Contact_Site.ContactID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).json(results)
        }
        else {
            return res.status(400).json({ code: 400, message: "No data found." })
        }

    })
})


app.get('/sitecontactlist', async (req, res) => {
    let query = `SELECT 
    Contact_Site.SiteID,Contact.ContactName 
    FROM Contact_Site 
    JOIN Contact ON Contact.ContactID = Contact_Site.ContactID
    ORDER By Contact.ContactName`
    pool.query(query, function (err, results) {
        if (err) throw err
        return res.status(200).json(results)
    })
})

app.get('/getReportByPONumber', async (req, res) => {
    let query = `
    SELECT PO.POnumber, PO.POdate, WorkOrderID, SiteZone.Description,Site.SiteName,WorkType.WorkTypeName,WorkOrder.AssignedDateTime,WorkStatus.WorkStatus

FROM PO JOIN WorkOrder ON PO.POID = WorkOrder.POID
    JOIN SiteZone ON SiteZone.SiteZoneID = WorkOrder.SiteZoneID
    JOIN Site ON WorkOrder.SiteID = Site.SiteID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    
    where PO.POnumber = '${req.query.POnumber}'
    Order By WorkOrder.WorkOrderID
     
    
    `
    pool.query(query, function (err, results) {
        if (err) throw err
        return res.status(200).json(results)
    })
})

app.get('/po', async (req, res) => {
    var poDetails = getPODetailsPromise();
    var poInvoiceDetails = getPoInvoicePromise();
    Promise.all([poDetails, poInvoiceDetails])
      .then((allData) => {
        var returnData = {};
        returnData = allData[0];
        var invoiceData = allData[1];
        for(var i=0; i<returnData.message.length; i++) {
            if(invoiceData.length == 0) {
                returnData.message[i].poInvoiceDetails = [];
                continue;
            }
            var newInvoiceData = [];
            for(var j=0; j<invoiceData.length; j++) {
                if(returnData.message[i].POID == invoiceData[j].POID) {
                    newInvoiceData.push(invoiceData[j])
                }
            }
            returnData.message[i].poInvoiceDetails = newInvoiceData;

        }
       
        return res.status(200).json(returnData)
      })
      .catch((err) => {
        console.log("error is ====" + err);
        return res.status(200).json(err)
      });

})

function getPoInvoicePromise() {
    return new Promise((resolve, reject) => {
        let query = `select * from POInvoice
    
        `;
        pool.query(query, function (err, results) {
          if (err) throw err;
          if (results.length >= 0) {
            resolve(results);
          } else {
            reject({ code: 400, message: "No data found" });
          }
        });
      });
}

function getPODetailsPromise() {
  return new Promise((resolve, reject) => {
    let query = `select PO.*,Contact.ContactName,Staff.StaffName,Company.CompanyName,POStatus.POStatus from PO 
    JOIN Contact ON Contact.ContactID = PO.ContactID
    JOIN Staff ON Staff.StaffID = PO.StaffID
    JOIN Company ON PO.CompanyID = Company.CompanyID
    JOIN POStatus ON POStatus.POStatusID = PO.POStatusID
    ORDER BY POID`;
    pool.query(query, function (err, results) {
      if (err) throw err;
      if (results.length >= 0) {
        resolve({ code: 200, message: results });
      } else {
        reject({ code: 400, message: "No data found" });
      }
    });
  });
}



app.post('/po', async (req, res) => {
    const buffer = Buffer.from(req.body["POImageURL"], 'base64')
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    const blob = bucket.file("konnect" + id + "." + req.body['POFilename'].split('.').pop());
    const blobStream = blob.createWriteStream();
    let poInvoiceDetails = req.body.Invoices;
    delete req.body['Invoices']

    blobStream.on('error', err => {
        next(err);
    });
    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);

        let query = `INSERT INTO PO(POID,POnumber,POdate,POImageURL,ContactID,StaffID,POStatusID,CompanyID,POFilename, Amount, Description, AddedbyUserID, AddedDateTime) VALUES(?,?,?,?,?,?,?,?,?,?,?, ?,?)`
        pool.query(query, ["", req.body.POnumber, req.body.POdate, publicUrl, req.body.ContactID, req.body.StaffID, req.body.POStatusID, req.body.CompanyID, req.body.POFilename, req.body.Amount, req.body.Description, req.body.AddedByUserID, req.body.AddedDateTime], function (error, results) {
            if (error) return res.send(error);
            if (results.affectedRows > 0) {
          
                    var workOrderInsertPromise = insertWorkOrderData(req);

                    let insertPoInvoicePromise = insertPOInvoice(
                      poInvoiceDetails,
                      req,
                      results.insertId
                    );
                    Promise.all([
                      insertPoInvoicePromise,
                      workOrderInsertPromise,
                    ])
                      .then((allData) => {
                        return res.status(200).json({
                          code: 200,
                          message: "Data updated sucessfully",
                        });
                      })
                      .catch((err) => {
                        console.log(
                          "error while inserting po invoice *********" + err
                        );
                        return res.status(400).send(err);
                      });
                
             } else {
                return res.status(400).json({ code: 400, "message": "Data is not inserted." })
            }
        })
    })
    blobStream.end(buffer);
})

function insertPOInvoice(poInvoiceDetails, req, poId) {
    return new Promise((resolve, reject) => {
        if(poInvoiceDetails.length == 0) {
            resolve("No po invoices data to insert");
        }
      for (var j = 0; j < poInvoiceDetails.length; j++) {
        var singleData = poInvoiceDetails[j];

        singleData.POID = poId;
        var insertPoInvoicePromise = insertPoInvoiceData(singleData, req);

        Promise.all([
          insertPoInvoicePromise,
         
        ])
          .then((allData) => {
            resolve({ code: 200, message: "updated successfully." });
          })
          .catch((err) => {
            console.log("error is ====" + err);
            reject(err);
          });
      }
    });
}
function insertWorkOrderData(req) {
    return new Promise((resolve, reject) => {
        if(req.body["WorkOrders"].length == 0) {
            resolve("No work orders to insert");
            return;
        }
      let values = [];

      for (let data of req.body["WorkOrders"]) {
        let value = [];
        value.push(results.insertId);
        value.push(data.SiteID);
        value.push(data.TeamID);
        value.push(data.WorkTypeID);
        value.push(data.CreatedType);
        value.push(data.RequestedStartDate);
        value.push(data.RequestedEndDate);
        value.push(data.WorkStatusID);
        value.push(data.AssignedDateTime);
        value.push(data.UpdatedByUserID);
        value.push(data.UpdatedDateTime);
        value.push(data.SiteZoneID);
        value.push(data.WorkNatureID);
        values.push(value);
      }

      var sql =
        "INSERT INTO WorkOrder(POID, SiteID, TeamID, WorkTypeID, CreatedType, RequestedStartDate,RequestedEndDate,WorkStatusID, AssignedDateTime,UpdatedByUserID,UpdatedDateTime,SiteZoneID,WorkNatureID) VALUES ?";

      pool.query(sql, [values], function (err, result) {
        if (err) throw err;
        if (result.affectedRows > 0) {
          resolve(result)
        } else {
            resolve(result)
        }
      });
    });
}

app.put('/po', async (req, res) => {
    try {
        const detail = req.body
        let workOrderValues = req.body.WorkOrders
        let poInvoiceDetails = req.body.poInvoiceDetails;
        //let contactObjects = req.body
        delete detail['WorkOrders']
        delete detail['poInvoiceDetails']

        if (detail['POImageURL']) {
            const buffer = Buffer.from(detail["POImageURL"], 'base64')
            // Create a new blob in the bucket and upload the file data.
            const id = uuid.v4();
            const blob = bucket.file("konnect" + id + "." + req.body['POFilename'].split('.').pop());
            const blobStream = blob.createWriteStream();

            blobStream.on('error', err => {
                throw (err);
            });
            blobStream.on('finish', () => {
                const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
                detail['POImageURL'] = publicUrl
                let query = `Update PO SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where POID = ?"
                const parameters = [...Object.values(detail), req.query.POID]
                pool.query(query, parameters, function (err, poresults, fields) {
                    if (err) throw err

                    for (let woValues of workOrderValues) {
                        //console.log(woValues)
                        if (!!!woValues['WorkOrderID']) {
                            var sql = "INSERT INTO WorkOrder(POID, SiteID, TeamID, WorkTypeID, CreatedType, RequestedStartDate,RequestedEndDate,WorkStatusID,WorkNatureID, AssignedDateTime,UpdatedByUserID,UpdatedDateTime,SiteZoneID) VALUES (?,?,?,?,?,?,?,?,?,?)";
                            let parameters = [req.query.POID, woValues['SiteID'], woValues['TeamID'], woValues['WorkTypeID'], woValues['CreatedType'], woValues['RequestedStartDate'], woValues['RequestedEndDate'], woValues['WorkStatusID'], woValues['WorkNatureID'], woValues['AssignedDateTime'], woValues['UpdatedByUserID'], woValues['UpdatedDateTime'], woValues['SiteZoneID']]
                            pool.query(sql, parameters, function (err, result, fields) {
                                if (err) throw err;
                                if (result.affectedRows > 0) {
                                    //console.log(result)
                                }
                                else {
                                    return res.status(401).json({ code: 401, "message": "Failed to create work order." })
                                }
                            });
                        }
                        else {
                            //console.log("in else")
                            let sql = `SELECT 1 FROM WorkOrder WHERE workorderid = ${woValues['WorkOrderID']}`
                            pool.query(sql, function (err, result, fields) {
                                if (err) throw err;
                                if (result.length > 0) {
                                    let query = `Update WorkOrder SET  ` + Object.keys(woValues).map(key => `${key}=?`).join(",") + " where WorkOrderID = ?"
                                    const parameters = [...Object.values(woValues), woValues['WorkOrderID']]
                                    pool.query(query, parameters, function (err, results, fields) {
                                        if (results.affectedRows > 0) {
                                            console.log(results)
                                        }
                                    })
                                }
                            });
                        }
                    }
                })

                let updatePoInvoiceData = updatePOInvoice(poInvoiceDetails, req);
                Promise.all([updatePoInvoiceData])
                    .then((allData) => {
                        return res.status(200).json({ code: 200, "message": "Data updated sucessfully" })
                    })
                    .catch((err) => {
                        console.log("error while updating po invoice *********" + err);
                        return res.status(400).send(err);
                    });
            })
            blobStream.end(buffer);

        } else {
            let query = `Update PO SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where POID = ?"
            const parameters = [...Object.values(detail), req.query.POID]
            pool.query(query, parameters, function (err, poresults, fields) {
                if (err) throw err

                for (let woValues of workOrderValues) {
                    console.log(woValues)
                    if (!!!woValues['WorkOrderID']) {
                        var sql = "INSERT INTO WorkOrder(POID, SiteID,TeamID, WorkTypeID, CreatedType, RequestedStartDate,RequestedEndDate,WorkStatusID, WorkNatureID, AssignedDateTime,UpdatedByUserID,UpdatedDateTime,SiteZoneID) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
                        let parameters = [req.query.POID, woValues['SiteID'], woValues['TeamID'], woValues['WorkTypeID'], woValues['CreatedType'], woValues['RequestedStartDate'], woValues['RequestedEndDate'], woValues['WorkStatusID'], woValues['WorkNatureID'], woValues['AssignedDateTime'], woValues['UpdatedByUserID'], woValues['UpdatedDateTime'], woValues['SiteZoneID']]
                        pool.query(sql, parameters, function (err, result, fields) {
                            if (err) throw err;
                            if (result.affectedRows > 0) {
                                //console.log(result)
                            }
                            else {
                                return res.status(401).json({ code: 401, "message": "Failed to create work order." })
                            }
                        });
                    }
                    else {
                        console.log("in else")
                        let sql = `SELECT 1 FROM WorkOrder WHERE workorderid = ${woValues['WorkOrderID']}`
                        pool.query(sql, function (err, result, fields) {
                            if (err) throw err;
                            if (result.length > 0) {
                                let query = `Update WorkOrder SET  ` + Object.keys(woValues).map(key => `${key}=?`).join(",") + " where WorkOrderID = ?"
                                const parameters = [...Object.values(woValues), woValues['WorkOrderID']]
                                pool.query(query, parameters, function (err, results, fields) {
                                    if (results.affectedRows > 0) {
                                        console.log(results)
                                    }
                                })
                            }
                        });
                    }
                }
            })

            let updatePoInvoiceData = updatePOInvoice(poInvoiceDetails, req);
            Promise.all([updatePoInvoiceData])
              .then((allData) => {
                return res
                  .status(200)
                  .json({ code: 200, message: "Data updated sucessfully" });
              })
              .catch((err) => {
                console.log("error while updating po invoice *********" + err);
                return res.status(400).send(err);
              });
        }
    } catch (error) {
        return res.status(500).json({ "message": error })
    }


})

function updatePOInvoice(poInvoiceDetails, req) {
    return new Promise((resolve, reject) => {
        if (!poInvoiceDetails || (poInvoiceDetails && poInvoiceDetails.length == 0)) {
            resolve("no findings to update");
            return;
        }
        let sql = `
        Delete FROM POInvoice WHERE POID = ${req.query.POID}
        `;
        console.log(sql);
        pool.query(sql, function (err, result, fields) {
            if (err) throw err;
            if (result) {

                for (var j = 0; j < poInvoiceDetails.length; j++) {
                    var singleData = poInvoiceDetails[j];

                    var insertPoInvoicePromise = insertPoInvoiceData(singleData, req);


                    //it will run always to delete not in the list
                    var findingsIdList = [];
                    for (var i = 0; i < poInvoiceDetails.length; i++) {
                        findingsIdList.push(poInvoiceDetails[i].POInvoiceID);
                    }

                    console.log("deleting existing findings are ----->" + findingsIdList);
                    // var deleteFindigsPromise = deleteFindingsData(
                    //   singleData,
                    //   findingsIdList,
                    //   req
                    // );
                    Promise.all([
                        insertPoInvoicePromise,
                        // updateFindingsPromise,
                        //deleteFindigsPromise,
                    ])
                        .then((allData) => {

                            resolve({ code: 200, message: "updated successfully." });
                        })
                        .catch((err) => {
                            console.log("error is ====" + err);
                            reject(err);
                        });
                }
            }
        });
    });
}


function insertPoInvoiceData(singleData, req) {
    return new Promise((resolve, reject) => {
        console.log("before---------> " + singleData.POID)

        console.log("inside insert POInvoice");
        var sql =
            "INSERT INTO POInvoice(POID, Invoice) VALUES (?,?)";
        let parameters = [
            singleData["POID"],
            singleData["Invoice"]
        ];
        pool.query(sql, parameters, function (err, result, fields) {
            if (err) throw err;
            if (result.affectedRows > 0) {
                resolve("updated POInvoice");
            } else {
                resolve("update failed POInvoice");
            }
        });

    });
}

app.delete('/po', async (req, res) => {
    let query = `DELETE FROM PO WHERE POID =${req.query.POID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(400).json({ "code": 400, "message": "Given POinID is not there" })
        }
    })
})

app.get('/workorder', async (req, res) => {
    let query = `Select WorkOrder.*,Site.SiteName,WorkType.WorkTypeName,WorkStatus.WorkStatus,SiteZone.Description,Staff.StaffName,Staff.StaffID from WorkOrder
    JOIN PO ON PO.POID = WorkOrder.POID
    JOIN Staff ON Staff.StaffID = PO.StaffID
    JOIN Site ON Site.SiteID = WorkOrder.SiteID
    JOIN SiteZone ON SiteZone.SiteZoneID = WorkOrder.SiteZoneID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    ORDER BY WorkOrder.WorkOrderID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(400).json({ code: 400, message: "No data found" })
        }
    })
})

app.get('/poworkorder', async (req, res) => {
    let query = `Select WorkOrder.* 
    FROM WorkOrder
    JOIN PO ON PO.POID = WorkOrder.POID
    WHERE PO.POID = ${req.query.POID}
    ORDER By WorkOrder.WorkOrderID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(200).json({ code: 200, message: "No data found" })
        }
    })
})

app.post('/workorder', async (req, res) => {

    let query = `Insert into WorkOrder values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    let parameters = ["", req.body.SiteID,req.body.POID,req.body.SiteZoneID,req.body.TeamID, req.body.WorkTypeID, req.body.CreatedType, req.body.RequestedStartDate, req.body.RequestedEndDate, req.body.AssignedDateTime, req.body.WorkStatusID, req.body.WorkNatureID,req.body.UpdatedByUserID, req.body.UpdatedDateTime]
    pool.query(query, parameters, function (err, result) {
        if (err)
            throw err;
        if (result.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "Data is inserted successfully" })
        } else {
            return res.status(400).json({ code: 400, message: "Data is not inserted" })
        }
    })
})

app.put('/workorder', async (req, res) => {
    const detail = req.body
    delete detail['AssignedWorkers'];
    var dateTime = moment(req.body.AssignedDateTime);
    req.body.AssignedDateTime = dateTime.format('YYYY-MM-DD HH:mm:SS');

    let query = "Update WorkOrder SET " + Object.keys(req.body).map(key => `${key}=?`).join(",") + ` where WorkOrderID = ${req.query.WorkOrderID}`
    const parameters = [...Object.values(detail), req.query.WorkOrderID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err
    
        var getWorkersFromTeam = getWorkersFromTeamPromise(req.body.TeamID);

        Promise.all([getWorkersFromTeam]).then(data => {
            var staffIds = [];
            for(var m=0; m<data[0].length; m++) {
                staffIds.push(data[0][m].StaffID);
            }
            if (staffIds.length > 0) {

                let sql = `DELETE FROM WorkOrderStaff WHERE WorkOrderID = ${req.query.WorkOrderID} AND StaffID NOT IN (${staffIds})`
                pool.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    if (result.length > 0) {
                        console.log(results)
                    } else {
                        console.log(results)
                    }
                })
    
                for (let woWorker of staffIds) {
                    //console.log(woValues)
    
    
                    let sql = `SELECT 1 FROM WorkOrderStaff WHERE WorkOrderID = ${req.query.WorkOrderID} AND StaffID = ${woWorker}`
                    pool.query(sql, function (err, result, fields) {
                        if (err) throw err;
                        if (result.length > 0) {
                            return res.status(200).json({ code: 200, "message": "Update workOrder Successful." })
                        }
                        else {
                            var sql = "INSERT INTO WorkOrderStaff(WorkOrderID, StaffID, AddedByUserID, AddedDateTime) VALUES (?,?,?,?)";
                            let parameters = [req.query.WorkOrderID, woWorker, req.body.UpdatedByUserID, req.body.UpdatedDateTime]
                            pool.query(sql, parameters, function (err, result, fields) {
                                if (err) throw err;
                                if (result.affectedRows > 0) {
                                                                        
                                    return res.status(200).json({ code: 200, "message": "Update workOrder Successful." })
                                    
                                }
                                else {
                                    return res.status(401).json({ code: 401, "message": "New work order staff not updated." })
                                }
                            });
                        }
                    })
                }
    
            }
            else {
                let sql = `SELECT 1 FROM WorkOrderStaff WHERE WorkOrderID = ${req.query.WorkOrderID}`
                pool.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    if (result.length > 0) {
                        let sql = `DELETE FROM WorkOrderStaff WHERE WorkOrderID = ${req.query.WorkOrderID}`
                        pool.query(sql, function (err, result, fields) {
                            if (err) throw err;
                            if (result.length > 0) {
                                console.log(results)
                            } else {
                                return res.status(200).json({ code: 200, "message": "No workers present to be removed." })
                            }
                        })
                    }
                })
            }
        }).catch((err) => {
            console.log("error while updating work order is ====" + err);
            reject(err);
        });
        
        
    });
})

function getWorkersFromTeamPromise(teamId) {
    return new Promise((resolve, reject) => {
      let query = `select TeamStaff.StaffID from TeamStaff where TeamID =${teamId}`;
      pool.query(query, function (error, results, fields) {
        if (error) throw error;
        resolve(results);
      });
    });
}

app.delete('/workorder', async (req, res) => {
    let query = `SELECT * FROM WorkOrderStaff WHERE WorkOrderID  =${req.query.WorkOrderID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            let query = `DELETE FROM WorkOrderStaff WHERE WorkOrderID  =${req.query.WorkOrderID}`
            pool.query(query, function (error, results, fields) {
                if (error) throw error
                if (results.affectedRows > 0) {
                    console.log(results)
                }
                else {
                    return res.status(400).json({ "code": 400, "message": "WorkOrderStaff not deleted." })
                }
            })
        }
    })
    let query1 = `DELETE FROM WorkOrder WHERE WorkOrderID  =${req.query.WorkOrderID}`
    pool.query(query1, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "WorkOrder deleted successfully" })
        } else {
            return res.status(400).json({ "code": 400, "message": "WorkOrder not deleted." })
        }

    })
})

app.get('/staffdetails', async (req, res) => {
    let query = `select StaffID,StaffName from Staff order by StaffName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }

    })
})

app.get('/contactdetails', async (req, res) => {
    let query = `select ContactID,ContactName from Contact order by ContactName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }

    })
})

app.get('/sitedetails', async (req, res) => {
    let query = `select SiteID,SiteName from Site order by SiteName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }
    })
})

app.get('/worktype', async (req, res) => {
    let query = `select WorkTypeID,WorkTypeName from WorkType order by WorkTypeName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "Data is not there" })
        }

    })
})

app.get('/worknature', async (req, res) => {
    let query = `select WorkNatureID,WorkNature from WorkNature order by WorkNature`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No work nature data present." })
        }

    })
})

app.get('/workstatus', async (req, res) => {
    let query = `select WorkStatusID,WorkStatus from WorkStatus order by WorkStatus`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }
    })
})


app.get('/poJobDetails', async (req, res) => {
    let query = `SELECT WorkOrder.WorkOrderID, WorkOrder.SiteID,Site.SiteName, WorkType.WorkTypeID, WorkType.WorkTypeName, WorkOrder.WorkNatureID,WorkNature.WorkNature,WorkOrder.SiteZoneID,SiteZone.Description,WorkStatus.WorkStatus
    FROM WorkOrder
    JOIN WorkOrderStaff ON WorkOrder.WorkOrderID = WorkOrderStaff.WorkOrderID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkNature ON WorkNature.WorkNatureID = WorkOrder.WorkNatureID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    JOIN Site ON Site.SiteID = WorkOrder.SiteID
    JOIN SiteZone ON WorkOrder.SiteZoneID = SiteZone.SiteZoneID
            WHERE WorkOrderStaff.StaffID = ${req.query.StaffID}
            AND WorkOrder.RequestedStartDate = DATE('${req.query.RequestedStartDate}')`
    pool.query(query, function (err, results) {

        if (err) throw err
        if (results.length > 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).send({ code: 400, message: "No job available for this user" })
        }
    })

})

app.get('/company', async (req, res) => {
    let query = `select * from Company`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No company data available." })
        }

    })
})

app.get('/contactcompany', async (req, res) => {
    let query = `select * from Contact where companyid = ${req.query.CompanyID} order by ContactName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No contacts available for the company selected." })
        }

    })
})

app.get('/workers', async (req, res) => {
    let query = `select * from Staff order by StaffName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No worker staffs available." })
        }

    })
})

app.get('/postatus', async (req, res) => {
    let query = `select * from POStatus`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No PO Status available." })
        }

    })
})

app.get('/sitelistbyzone', async (req, res) => {
    let query = `select * from Site where SiteZoneID = ${req.query.SiteZoneID} ORDER BY SiteName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No sites available for the zone selected." })
        }

    })
})


app.get('/assignedworker', async (req, res) => {
    let query = `select WorkOrderStaff.*,Staff.StaffName from WorkOrderStaff
     JOIN Staff ON Staff.StaffID = WorkOrderStaff.StaffID
     where WorkOrderID = ${req.query.WorkOrderID}`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No staff available for the workorder selected." })
        }

    })
})

app.get('/findings', async (req, res) => {
    let query = `select * from Findings where FindingsType = '${req.query.FindingsType}' ORDER BY FindingsName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No findings available for the finding type selected." })
        }

    })
})

app.get('/getContacts', async (req, res) => {
    let query = `select Contact_Site.ContactID,Contact.ContactName from Contact_Site
    JOIN Contact ON Contact.ContactID = Contact_Site.ContactID
    WHERE Contact_Site.SiteID = ${req.query.SiteID} ORDER BY ContactName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No findings available for the finding type selected." })
        }

    })
})

app.get('/reportsbyPO', async (req, res) => {
    let query = `SELECT PO.POnumber, PO.POdate, WorkOrderID, SiteZone.Description,Site.SiteName,WorkType.WorkTypeName,WorkOrder.AssignedDateTime,WorkStatus.WorkStatus
    FROM PO JOIN WorkOrder ON PO.POID = WorkOrder.POID
    JOIN SiteZone ON SiteZone.SiteZoneID = WorkOrder.SiteZoneID
    JOIN Site ON WorkOrder.SiteID = Site.SiteID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    Order By WorkOrder.WorkOrderID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No jobs available." })
        }

    })
})


app.get('/workersbyPO', async (req, res) => {
    let query = `SELECT WorkOrder.WorkOrderID,WorkOrderStaff.StaffID,Staff.StaffName FROM WorkOrder 
    JOIN WorkOrderStaff ON WorkOrderStaff.WorkOrderID = WorkOrder.WorkOrderID
    JOIN Staff ON Staff.StaffID = WorkOrderStaff.StaffID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No jobs available for the data selected." })
        }

    })
})

app.post("/postImagesToReportImage", multer.single('file'), async (req, res) => {

    const buffer = Buffer.from(req.body["imageBase64"], "base64");
    // Create a new blob in the bucket and upload the file data.
    const id = uuid.v4();
    const blob = bucket.file("reportImage" + id + ".jpg");
    const blobStream = blob.createWriteStream();

    blobStream.on("error", (err) => {
        res.status(401).json({ code: 401, message: "Failed to upload Image" });
    });

    blobStream.on("finish", () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);

        let query = `
    INSERT INTO ReportImage (ReportWOID, ImageTypeID, ImageRemarks, ImageURL, AddedByUserID, AddedDateTime) 
    VALUES(?,?,?,?,?,?)
    `;
        let parameters = [
            req.body.ReportWOID,
            req.body.ImageTypeID,
            req.body.ImageRemarks,
            publicUrl,
            req.body.AddedByUserID,
            req.body.AddedDateTime
        ];
        pool.query(query, parameters, function (error, results, fields) {
            if (error) throw error;
            if (results.affectedRows > 0) {
                return res
                    .status(200)
                    .json({ code: 200, message: "Inserted successfully." });
            } else {
                return res.status(401).json({ code: 401, message: "Not inserted." });
            }
        });
    });
    blobStream.end(buffer);


});

app.get("/getReportImages", async (req, res) => {

    let query = `SELECT * FROM ReportImage where ReportImage.ReportWOID =  ${req.query.ReportWOID} AND ImageTypeID = ${req.query.ImageTypeID}`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No images available for the data selected." })
        }

    });


});

app.delete("/deleteImageByDB", async (req, res) => {
    let query = `
    DELETE from ReportImage WHERE ReportImageID =  ${req.query.ReportImageID}

    `
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }

    })

});

function getAllFindingsPromise(req) {
    return new Promise((resolve, reject) => {
        if (req.query.type == "Fogging" || req.query.type == "Mosquito Control") {
            resolve([]);
            return;
        }
        let query = `
        select * from Findings where FindingsType = '${req.query.type}'
    

    `;
        pool.query(query, function (err, results) {
            if (err) throw err;

            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        });
    });

}


function getAllServicesPromise(req) {
    return new Promise((resolve, reject) => {
        if (req.query.type == "Fogging") {
            resolve([]);
            return;
        }
        let query = `
        select * from ServiceType where ServiceType = '${req.query.type}'
    

    `;
        pool.query(query, function (err, results) {
            if (err) throw err;

            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        });
    });

}



app.get('/getReportWO', async (req, res) => {
    var reportPromise = getReportWOPromise(req);
    var allFindings = getAllFindingsPromise(req);
    var allServices = getAllServicesPromise(req);
    var servicesPromise = getServicesPrmoise(req);
    var findingsPromise = getFindingsPromise(req);
    var serviceMethodsPromise = getServiceMethods();
    Promise.all([reportPromise, allFindings, allServices, servicesPromise, findingsPromise, serviceMethodsPromise])
        .then((allData) => {
            var returnData = [];
            var single = allData[0];

            for (let i of allData[4]) {
                for (let a of allData[1]) {
                    if (a.FindingsID == i.FindingsID) {
                        a.IsChecked = i.IsChecked
                        a.Value = i.Value
                    }
                }
            }
            single.findings = allData[1];


            for (let i of allData[3]) {
                for (let a of allData[2]) {
                    if (a.ServiceID == i.ServiceID) {
                        a.IsChecked = i.IsChecked
                        a.Value = i.Value
                    }
                }
            }
            single.services = allData[2];

            var serviceMethods = [];
            for (var k = 0; k < allData[5].length; k++) {
                var serviceMethod = allData[5][k];
                if (allData[5][k].ServiceMethodID == single.ServiceMethodID) {
                    serviceMethod.IsChecked = 1;
                }
                serviceMethods.push(serviceMethod);
            }
            single.serviceMethods = serviceMethods;
            returnData.push(single);

            return res.status(200).send(returnData[0]);
        })
        .catch((err) => {
            return res.status(403).send(err);
        });

});;

function getServiceMethods() {
    return new Promise((resolve, reject) => {
        let query = `
        select * from ServiceMethod    

    `;
        pool.query(query, function (err, results) {
            if (err) throw err;

            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        });
    });

}

function getFindingsPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `
        SELECT ReportWOFindings.ReportWOFindingsID, ReportWOFindings.ReportWOID,
ReportWOFindings.FindingsID, ReportWOFindings.Value, ReportWOFindings.IsChecked,
ReportWOFindings.UpdatedByUserID, ReportWOFindings.UpdatedDateTime

from ReportWOFindings
JOIN ReportWO on ReportWO.ReportWOID = ReportWOFindings.ReportWOID
 JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID
 
 WHERE WorkOrder.WorkOrderID = ${req.query.WorkOrderID}
    

    `;
        pool.query(query, function (err, results) {
            if (err) throw err;

            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        });
    });

}

function getServicesPrmoise(req) {
    return new Promise((resolve, reject) => {
        let query = `
        SELECT ReportWOService.ReportWOServiceID, ReportWOService.ReportWOID,
ReportWOService.ServiceID, ReportWOService.Value, ReportWOService.IsChecked,
ReportWOService.UpdatedByUserID, ReportWOService.UpdatedDateTime

from ReportWOService
JOIN ReportWO on ReportWO.ReportWOID = ReportWOService.ReportWOID
 JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID
 
 WHERE WorkOrder.WorkOrderID =${req.query.WorkOrderID}
    

    `;
        pool.query(query, function (err, results) {
            if (err) throw err;

            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        });
    });
}

function getReportWOPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `
    select ReportWO.ReportWOID, ReportWO.WorkOrderID, ReportWO.WOstartDateTime, ReportWO.WOendDateTime,
    ReportWO.WorkNatureID, ReportWO.WorkNatureID, ReportWO.Findings, ReportWO.Location, ReportWO.ServiceMethodID, ReportWO.FogMachineNum,ReportWO.ContactAckMethodID, ReportWO.ContackAckOther, ReportWO.ContactAckSignImageURL, ReportWO.ContactAckDateTime, ReportWO.consolidateDateTime, ReportWO.UpdatedUserID, ReportWO.UpdatedDateTime, WorkOrder.WorkStatusID,
    ReportWO.ContactAckID, Contact.ContactName, ReportWO.Notes
    from ReportWO 
    JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID
    LEFT JOIN Contact on Contact.ContactID = ReportWO.ContactAckID
    WHERE ReportWO.WorkOrderID = ${req.query.WorkOrderID} and ReportWO.UpdatedUserID = ${req.query.UpdatedUserID}

    `;
        pool.query(query, function (err, results) {
            if (err) throw err;
            if (results.length > 0) {
                return resolve(results[0]);
            } else {
                return reject({
                    code: 403,
                    message: "Yet to start the Work order.",
                });
            }
        });
    });
}

function getReportWoDetails(detail) {
    var reportWoDetails = {};
    if (detail.hasOwnProperty("ReportWOID")) {
        reportWoDetails.ReportWOID = detail["ReportWOID"];
    }

    if (detail.hasOwnProperty("WorkOrderID")) {
        reportWoDetails.WorkOrderID = detail["WorkOrderID"];
    }

    if (detail.hasOwnProperty("WOstartDateTime")) {
        reportWoDetails.WOstartDateTime = detail["WOstartDateTime"];
    }

    if (detail.hasOwnProperty("WOendDateTime")) {
        reportWoDetails.WOendDateTime = detail["WOendDateTime"];
    }

    if (detail.hasOwnProperty("WorkNatureID")) {
        reportWoDetails.WorkNatureID = detail["WorkNatureID"];
    }

    if (detail.hasOwnProperty("Findings")) {
        reportWoDetails.Findings = detail["Findings"];
    }

    if (detail.hasOwnProperty("Location")) {
        reportWoDetails.Location = detail["Location"];
    }

    if (detail.hasOwnProperty("ServiceMethodID")) {
        reportWoDetails.ServiceMethodID = detail["ServiceMethodID"];
    }

    if (detail.hasOwnProperty("FogMachineNum")) {
        reportWoDetails.FogMachineNum = detail["FogMachineNum"];
    }

    if (detail.hasOwnProperty("ContactAckMethodID")) {
        reportWoDetails.ContactAckMethodID = detail["ContactAckMethodID"];
    }
    if (detail.hasOwnProperty("ContactAckID")) {
        reportWoDetails.ContactAckID = detail["ContactAckID"];
    }
    if (detail.hasOwnProperty("ContackAckOther")) {
        reportWoDetails.ContackAckOther = detail["ContackAckOther"];
    }
    if (detail.hasOwnProperty("ContactAckSignImageURL")) {
        reportWoDetails.ContactAckSignImageURL = detail["ContactAckSignImageURL"];
    }
    if (detail.hasOwnProperty("ContactAckDateTime")) {
        reportWoDetails.ContactAckDateTime = detail["ContactAckDateTime"];
    }
    if (detail.hasOwnProperty("consolidateDateTime")) {
        reportWoDetails.consolidateDateTime = detail["consolidateDateTime"];
    }
    if (detail.hasOwnProperty("Notes")) {
        reportWoDetails.Notes = detail["Notes"];
    }
    if (detail.hasOwnProperty("UpdatedUserID")) {
        reportWoDetails.UpdatedUserID = detail["UpdatedUserID"];
    }
    if (detail.hasOwnProperty("UpdatedDateTime")) {
        reportWoDetails.UpdatedDateTime = detail["UpdatedDateTime"];
    }

    return reportWoDetails;

}

app.put('/updateReportPO', async (req, res) => {

    let detail = req.body;
    var reportWoDetails = getReportWoDetails(detail);
    var services = detail['services'];
    var findings = detail['findings'];
    delete detail['services'];
    delete detail['findings'];
    if (detail['ContactAckDateTime'] != null &&
        (detail['ContactAckID'] != null || detail['ContackAckOther'] != null)) {
        console.log("input data has ContactAckID or  ContackAckOther ");
        let query = `UPDATE WorkOrder 
        JOIN ReportWO
        on ReportWO.WorkOrderID = WorkOrder.WorkOrderID
        
        set WorkOrder.WorkStatusID = 4
        
        WHERE ReportWO.ReportWOID = ${req.query.ReportWOID}`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.affectedRows > 0) {
                var reportPromise = updateReportWOFindings(findings, req);
                var servicePromise = updateReportWOService(services, req);
                var list = [];
                if (findings && findings.length > 0) {
                    list.push(reportPromise);
                }
                if (services && services.length > 0) {
                    list.push(servicePromise);
                }
                Promise.all(list)
                    .then((allData) => {
                        return res.status(200).send({ code: 200, "message": "updated ReportPO successfully." });
                    })
                    .catch((err) => {
                        console.log("erroe *********" + err);
                        return res.status(400).send(err);
                    });
                //updateReportWOFindings(findings, req);
                //updateReportWOService(services, req);
                // return res.status(200).send({ code: 200, message: "update success" })
            } else {
                return res.status(400).json({ code: 400, message: "update failed" })
            }

        })

    }

    if (reportWoDetails['ContactAckSignImageURL']) {

        const buffer = Buffer.from(detail["ContactAckSignImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("signature" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });
        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            reportWoDetails['ContactAckSignImageURL'] = publicUrl

            let query = `Update ReportWO SET  ` + Object.keys(reportWoDetails).map(key => `${key}=?`).join(",") + " where ReportWOID = ?"
            const parameters = [...Object.values(reportWoDetails), req.query.ReportWOID]

            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    //updateReportWOFindings(findings, req);
                    // updateReportWOService(services, req);
                    var reportPromise = updateReportWOFindings(findings, req);
                    var servicePromise = updateReportWOService(services, req);
                    var list = [];
                    if (findings && findings.length > 0) {
                        list.push(reportPromise);
                    }
                    if (services && services.length > 0) {
                        list.push(servicePromise);
                    }
                    Promise.all(list)
                        .then((allData) => {


                            return res.status(200).send({ code: 200, "message": "updated ReportPO successfully." });
                        })
                        .catch((err) => {
                            return res.status(200).send(err);
                        });
                    // return res.status(200).json({ code: 200, message: "success" })
                } else {
                    return res.status(400).json({ code: 400, "message": "update reportPo with signature data not update" })
                }
            })
        })
        blobStream.end(buffer);

    }
    else {
        let query = `Update ReportWO SET  ` + Object.keys(reportWoDetails).map(key => `${key}=?`).join(",") + " where ReportWOID = ?"
        const parameters = [...Object.values(reportWoDetails), parseInt(req.query.ReportWOID)]

        pool.query(query, parameters, function (error, results) {
            if (error) throw error
            console.log(results.affectedRows)
            if (results.affectedRows > 0) {
                var reportPromise = updateReportWOFindings(findings, req);
                var servicePromise = updateReportWOService(services, req);
                var list = [];
                if (findings && findings.length > 0) {
                    list.push(reportPromise);
                }
                if (services && services.length > 0) {
                    list.push(servicePromise);
                }
                Promise.all(list)
                    .then((allData) => {
                        return res
                            .status(200)
                            .send({
                                code: 200,
                                message: "updated ReportPO successfully.",
                            });
                    })
                    .catch((err) => {
                        console.log("error7777777777_" + err);
                        return res
                            .status(400)
                            .send({
                                code: 400,
                                message: "updated ReportPO with errors." + err,
                            });
                    });
                // return res.status(200).json({ code: 200, message: "Updated successfully." })
            }
            /*else {
               return res.status(400).json({ code: 400, "message": "Update Failed." })
           }*/
        })
    }



});

app.post('/reportWOCreate', async (req, res) => {
    let query = "INSERT INTO `ReportWO`(`ReportWOID`, `WorkOrderID`, `WorkNatureID`, `WOstartDateTime`,`ServiceMethodID`,`ContactAckMethodID`,`UpdatedUserID`,`UpdatedDateTime`) VALUES (?,?,?,?,?,?,?,?)"
    let parameters = ["", req.body.WorkOrderID, req.body.WorkNatureID, req.body.WOstartDateTime, req.body.ServiceMethodID, req.body.ContactAckMethodID, req.body.UpdatedUserID, req.body.UpdatedDateTime]
    pool.query(query, parameters, function (error, results) {
        if (error) throw error
        if (results.affectedRows > 0) {
            let insertCosolidatedReportQuery = `
            INSERT INTO ConsolidatedReportWO ( ReportWOID, StaffID, StartedDateTime, 
                LocationPoint, FindingsImages, ServicesProvided, 
                ServiceImage, UpdatedByUserID, UpdatedDateTime, workOrderID) 
            VALUES(?,?,?,?,?,?,?,?,?,?)
            `;
            let newParameters = [

                results.insertId,
                req.body.UpdatedUserID,
                req.body.WOstartDateTime,
                "",
                "",
                "",
                "",
                req.body.UpdatedUserID,
                req.body.UpdatedDateTime,
                req.body.WorkOrderID
            ];
            pool.query(insertCosolidatedReportQuery, newParameters, function (error, results, fields) {
                if (error) throw error;
                if (results.affectedRows > 0) {
                    console.log("data inserted");
                } else {
                    // return res.status(401).json({ code: 401, message: "Not inserted." });
                    console.log("failed to insert");
                }
            });
            return res.status(200).json({ code: 200, message: "ReportWO inserted successfully." })
        } else {
            return res.status(401).json({ code: 401, "message": "ReportWO not inserted." })
        }
    })
})


app.put('/reportWOFogging', async (req, res) => {

    const detail = req.body

    if (detail['ContactAckSignImageURL']) {

        const buffer = Buffer.from(detail["ContactAckSignImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });
        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            detail['ContactAckSignImageURL'] = publicUrl

            let query = `Update ReportWO SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where ReportWOID = ?"
            const parameters = [...Object.values(detail), req.query.ReportWOID]
            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "ReportWO data updated successfully." })
                } else {
                    return res.status(401).json({ code: 401, "message": "ReportWO data not updated." })
                }
            })
        })
        blobStream.end(buffer);

    } else {

        var services = detail['services'];
        var findings = detail['findings'];
        delete detail['services'];
        delete detail['findings'];
        let query = `Update ReportWO SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where ReportWOID = ?"
        const parameters = [...Object.values(detail), req.query.ReportWOID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err

            if (results.affectedRows > 0) {
                if (findings != undefined && findings.length > 0) {
                    updateReportWOFindings(findings, req);
                }
                if (services != undefined && services.length > 0) {
                    updateReportWOService(services, req);
                }


                let updatedDetails = {
                    "WorkOrderID": detail.WorkOrderID,
                    "StartedDateTime": detail.WOstartDateTime,
                    "UpdatedDateTime": detail.UpdatedDateTime
                }
                let query = `Update ConsolidatedReportWO SET  ` + Object.keys(updatedDetails).map(key => `${key}=?`).join(",") + " where ReportWOID = ?"
                const parameters = [...Object.values(updatedDetails), req.query.ReportWOID]
                pool.query(query, parameters, function (err, results, fields) {
                    if (err)
                        throw err

                    if (results.affectedRows > 0) {

                        console.log("updated");

                    } else {

                        console.log("updated failed");
                    }

                });
                return res.status(200).json({ code: 200, message: "ReportWO data updated successfully." })
            } else {
                return res.status(401).json({ code: 401, "message": "ReportWO data not updated." })
            }
        })
    }

})

function insertNewFindingsData(singleData, req) {
    return new Promise((resolve, reject) => {
        console.log("before---------> " + singleData.FindingsID)

        console.log("inside insert report findings");
        var sql =
            "INSERT INTO ReportWOFindings(ReportWOID, FindingsID, Value,IsChecked,UpdatedByUserID,UpdatedDateTime) VALUES (?,?,?,?,?,?)";
        let parameters = [
            parseInt(req.query.ReportWOID),
            singleData["FindingsID"],
            singleData["Value"],
            singleData["IsChecked"],
            singleData["UpdatedByUserID"],
            singleData["UpdatedDateTime"],
        ];
        pool.query(sql, parameters, function (err, result, fields) {
            if (err) throw err;
            if (result.affectedRows > 0) {
                resolve("updated findings");
            } else {
                resolve("update failed findings");
            }
        });

    });
}

/* function updateFindingsData(singleData, req) {
  return new Promise((resolve, reject) => {
    let sql = `SELECT 1 FROM ReportWOFindings WHERE ReportWOID = ${req.query.ReportWOID}`;
    pool.query(sql, function (err, result, fields) {
      if (err) throw err;
      if (result.length > 0) {
        let query =
          `Update ReportWOFindings SET  ` +
          Object.keys(singleData)
            .map((key) => `${key}=?`)
            .join(",") +
          " where ReportWOID = ?";
        const parameters = [
          ...Object.values(singleData),
          parseInt(req.query.ReportWOID),
        ];
        pool.query(query, parameters, function (err, results, fields) {
          if (err) throw err;
          if (results.affectedRows > 0) {
            resolve("updated findings");
          }
        });
      } else {
        resolve("no update required for findings");
      }
    });
  });
} */

/* function deleteFindingsData(singleData, findingsIdList, req) {
  return new Promise((resolve, reject) => {
    let query = `
    DELETE  from ReportWOFindings where ReportWOID = ${
      req.query.ReportWOID
    } and FindingsID not in (${findingsIdList.join()})
  
    `;
    console.log("Sql for delete is->" + query);

    pool.query(query, function (err, results) {
      if (err) throw err;
      if (results.affectedRows > 0) {
        resolve("updated findings");
      } else {
        resolve("no deletion required");
      }
    });
  });
} */

function updateReportWOFindings(findings, req) {
    return new Promise((resolve, reject) => {
        if (!findings || (findings && findings.length == 0)) {
            resolve("no findings to update");
            return;
        }
        let sql = `Delete FROM ReportWOFindings WHERE ReportWOID = ${req.query.ReportWOID} AND UpdatedByUserID = ${req.body.UpdatedUserID}`;
        console.log(sql);
        pool.query(sql, function (err, result, fields) {
            if (err) throw err;
            if (result) {

                for (var j = 0; j < findings.length; j++) {
                    var singleData = findings[j];

                    var insertFindingsPromise = insertNewFindingsData(singleData, req);


                    //it will run always to delete not in the list
                    var findingsIdList = [];
                    for (var i = 0; i < findings.length; i++) {
                        findingsIdList.push(findings[i].FindingsID);
                    }

                    console.log("deleting existing findings are ----->" + findingsIdList);
                    // var deleteFindigsPromise = deleteFindingsData(
                    //   singleData,
                    //   findingsIdList,
                    //   req
                    // );
                    Promise.all([
                        insertFindingsPromise,
                        // updateFindingsPromise,
                        //deleteFindigsPromise,
                    ])
                        .then((allData) => {

                            resolve({ code: 200, message: "updated successfully." });
                        })
                        .catch((err) => {
                            console.log("error is ====" + err);
                            reject(err);
                        });
                }
            }
        });
    });

}

function insertNewServiceData(singleData, req) {
    return new Promise((resolve, reject) => {

        var sql =
            "INSERT INTO ReportWOService(ReportWOID, ServiceID, Value,IsChecked,UpdatedByUserID,UpdatedDateTime) VALUES (?,?,?,?,?,?)";
        let parameters = [
            parseInt(req.query.ReportWOID),
            singleData["ServiceID"],
            singleData["Value"],
            singleData["IsChecked"],
            singleData["UpdatedByUserID"],
            singleData["UpdatedDateTime"],
        ];
        pool.query(sql, parameters, function (err, result, fields) {
            if (err) throw err;
            if (result.affectedRows > 0) {
                resolve("updated services");
            } else {
                reject("update failed in report ReportWOService");
            }
        });

    });
}

/* function updateServicesData(singleData, req) {
  return new Promise((resolve, reject) => {
      let sql = `SELECT 1 FROM ReportWOService WHERE ReportWOID = ${req.query.ReportWOID}`;
      pool.query(sql, function (err, result, fields) {
          if (err) throw err;
          if (result.length > 0) {
              delete singleData["ReportWOServiceID"]
              let query =
                  `Update ReportWOService SET  ` +
                  Object.keys(singleData)
                      .map((key) => `${key}=?`)
                      .join(",") +
                  " where ReportWOID = ?";
              const parameters = [
                  ...Object.values(singleData),
                  parseInt(req.query.ReportWOID),
              ];
              pool.query(query, parameters, function (err, results, fields) {
                  if (err) throw err;
                  if (results.affectedRows > 0) {
                      console.log("service updated");
                      resolve("updated service")
                  } else {
                      console.log("service not updated");
                      resolve("no update")
                  }
              });
          } else {
              resolve("no update required for services")
          }
      });
  });
}
 
function deleteServicesData(singleData, servicesIdList, req) {
  return new Promise((resolve, reject) => {
      let query = `
      DELETE  from ReportWOService where ReportWOID = ${req.query.ReportWOID
              } and ServiceID not in (${servicesIdList.join()})
    
      `;
         
          pool.query(query, function (err, results, fields) {
              if (err) throw err;
              if (results.affectedRows > 0) {
                  resolve("updated");
              } else {
                  resolve("no delete service")
              }
          });
  });
} */

function updateReportWOService(services, req) {
    return new Promise((resolve, reject) => {

        if (!services || (services && services.length == 0)) {
            resolve("no services to update");
            return;
        }
        let sql = `Delete FROM ReportWOService WHERE ReportWOID = ${req.query.ReportWOID} AND UpdatedByUserID = ${req.body.UpdatedUserID}`;
        console.log(sql);
        pool.query(sql, function (err, result, fields) {
            if (err) throw err;
            if (result) {

                for (var k = 0; k < services.length; k++) {
                    var singleData = services[k];
                    //if (!!!singleData["ReportWOServiceID"]) {
                    // console.log("inside insert report services");
                    var insertNewServicePromise = insertNewServiceData(singleData, req);
                    // } else {
                    //  console.log("in else report service");
                    //  var updateServicesPromise = updateServicesData(singleData, req);
                    // }
                }

                //it will run always to delete not in the list
                var servicesIdList = [];
                for (var i = 0; i < services.length; i++) {
                    servicesIdList.push(services[i].ServiceID);
                }
                // var deleteServicesDataPromise = deleteServicesData(
                //   singleData,
                //   servicesIdList,
                //   req
                // );

                Promise.all([
                    insertNewServicePromise,
                    // updateServicesPromise,
                    // deleteServicesDataPromise,
                ])
                    .then((allData) => {
                        resolve({ code: 200, message: "updated successfully." });
                    })
                    .catch((err) => {
                        console.log("error is ====" + err);
                        reject(err);
                    });

            }
        });
    });
}

app.get("/getConsolidation", async (req, res) => {
    var consolidatedPromise = getConsolidationReports(req);
    var getImagesPromise = getImagesForConsolidation(req);
    Promise.all([consolidatedPromise, getImagesPromise]).then((allData) => {
        var returnData = [];
        for (var i = 0; i < allData[0].length; i++) {
            var single = allData[0][i];

            var images = [];
            for (var j = 0; j < allData[1].length; j++) {
                var image = allData[1][j];
                images.push(image);
            }

            single.imagesList = images;
            returnData.push(single)


        }

        return res.status(200).send(returnData);
    }).catch(err => {
        return res.status(200).send(err);
    });;
});

function getImagesForConsolidation(req) {
    return new Promise((resolve, reject) => {

        let query = `
        SELECT * FROM ReportImage 
JOIN ReportWO on ReportWO.ReportWOID = ReportImage.ReportWOID
JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID

where WorkOrder.WorkOrderID = ${req.query.workOrderID}
        `;


        pool.query(query, function (err, results) {
            if (err) throw err

            resolve(results);


        });

    });
}

function getConsolidationReports(req) {

    return new Promise((resolve, reject) => {

        let query = `
    select ConsolidatedReportWO.ConsWOID, ConsolidatedReportWO.ReportWOID, ConsolidatedReportWO.StaffID, ConsolidatedReportWO.StartedDateTime, ConsolidatedReportWO.LocationPoint, ConsolidatedReportWO.FindingsImages, ConsolidatedReportWO.ServicesProvided, ConsolidatedReportWO.ServiceImage, ConsolidatedReportWO.UpdatedByUserID, ConsolidatedReportWO.UpdatedDateTime, ConsolidatedReportWO.workOrderID, Staff.StaffName, ReportWO.FogMachineNum from ConsolidatedReportWO 
Join Staff on Staff.StaffID = ConsolidatedReportWO.StaffID
JOIN ReportWO on ReportWO.ReportWOID = ConsolidatedReportWO.ReportWOID
where ConsolidatedReportWO.workOrderID = ${req.query.workOrderID}
    `;


        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length == 0) {
                reject({ code: 400, message: "There is no data for selected values" });
            } else {
                resolve(results);
            }

        });

    });


}

app.get("/getServices", async (req, res) => {

    let query = `SELECT * from ServiceType WHERE ServiceType = '${req.query.ServiceType}' ORDER BY ServiceName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No service available for the type selected." })
        }

    })
});

app.get("/getServiceMethods", async (req, res) => {

    let query = `SELECT * FROM ServiceMethod`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(200).json({ code: 200, message: "No service methods available for the type selected." })
        }

    })
});

app.get("/getReportByPO", async (req, res) => {
    let query = `
     select * from WorkOrder where WorkOrderID = ${req.query.WorkOrderID} 
    `;

    pool.query(query, function (err, results) {
        if (err) throw err;
        if (results.length > 0) {
            var data = results[0];
            let newQuery = ``;
            if (data.WorkTypeID == 1) {
                newQuery = `
                
                select 
WorkOrder.SiteZoneID, WorkOrder.SiteID, Site.SiteTypeID
from ReportWO 
JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID
JOIN WorkType on WorkType.WorkTypeID = WorkOrder.WorkTypeID
JOIN Site on Site.SiteID = WorkOrder.SiteID
WHERE ReportWO.WorkOrderID = ${req.query.WorkOrderID} 
`;

                pool.query(newQuery, function (err, results) {
                    if (err) throw err;
                    if (results.length > 0) {
                        return res.status(200).send(results[0]);
                    } else {
                        return res.status(200).json({
                            "code": 200,
                            "message": "No Report Available"
                        });
                    }
                });
            } else {
                var allDataPromise = getAllData(req);
                var workersPromise = getWorkersData(req);
                var servicesPromise = getServices(req);
                var findingsPromise = getFindings(req);
                var checkWorkTypePromise = getWorkType(req);
                var imagesPromise = getImages(req);
                var getServiceTypeOtherPromise = getServiceTypeOther(req);

                Promise.all([
                    allDataPromise,
                    workersPromise,
                    servicesPromise,
                    checkWorkTypePromise,
                    imagesPromise,
                    getServiceTypeOtherPromise,
                    findingsPromise
                ])
                    .then((allData) => {
                        var returnData = [];

                        var single = allData[0][0];

                        var allWorkersName = [];
                        for (var j = 0; j < allData[1].length; j++) {
                            var worker = allData[1][j];
                            allWorkersName.push(worker.StaffName);
                        }
                        single.actionBy = allWorkersName;
                        var allServices = [];
                        for (var k = 0; k < allData[2].length; k++) {
                            var service = allData[2][k];
                            allServices.push(service.ServiceName);
                        }
                        single.serviceTypes = allServices;

                        single.images = {};
                        var beforeImages = [];
                        var afterImages = [];
                        for (var i = 0; i < allData[4].length; i++) {
                            if (allData[4][i].ImageTypeID == 1) {
                                beforeImages.push(allData[4][i]);
                            } else {
                                afterImages.push(allData[4][i]);
                            }
                        }
                        single.images.beforeImages = beforeImages;
                        single.images.afterImages = afterImages;

                        var allServiceTypeOther = [];
                        for (var k = 0; k < allData[5].length; k++) {
                            var singleServiceTypeOther = allData[5][k];
                            allServiceTypeOther.push(singleServiceTypeOther.ServiceTypeOther);
                        }
                        single.serviceTypeOthers = allServiceTypeOther;

                        var findings = [];
                        for (var m = 0; m < allData[6].length; m++) {
                            var finding = allData[6][m];
                            findings.push(finding);
                        }
                        single.findings = findings;
                        // if the workTypeId =3  meaning the mosquito fogging type then sending only the first data from the result
                        if (allData[3][0].WorkTypeID == 3) {
                            single.images.afterImages = [];
                        }
                        returnData.push(single);

                        return res.status(200).send(single);
                    })
                    .catch((err) => {
                        return res.status(200).send(err);
                    });
            }
        }
    });
});

function getWorkType(req) {


    return new Promise((resolve, reject) => {
        var allData;
        let query = `
        SELECT WorkTypeID FROM WorkOrder WHERE WorkOrderID = ${req.query.WorkOrderID}
   
        `
        pool.query(query, function (err, results) {
            if (err) reject(err)
            if (results.length == 0) {
                reject({ code: 200, message: "There is no workk type data for selected values" });
            }
            resolve(results);


        })

    });

}
function getServiceTypeOther(req) {


    return new Promise((resolve, reject) => {

        let query = `
        select DISTINCT ReportWOService.Value AS ServiceTypeOther from ReportWOService
      JOIN ReportWO ON ReportWOService.ReportWOID = ReportWO.ReportWOID
      JOIN WorkOrder ON ReportWO.WorkOrderID = WorkOrder.WorkOrderID
      JOIN ServiceType ON ServiceType.ServiceID = ReportWOService.ServiceID
      WHERE ReportWOService.Value IS NOT NULL AND ReportWOService.Value != "" AND ServiceType.ServiceName = "Others" AND
      ReportWO.WorkOrderID = ${req.query.WorkOrderID} `
        pool.query(query, function (err, results) {
            if (err) reject(err)
            if (results.length < 0) {
                reject({ code: 200, message: "There is no service type data for selected values" });
            }
            resolve(results);


        })

    });

}

function getImages(req) {


    return new Promise((resolve, reject) => {

        let query = `
        SELECT ReportImage.ImageURL,ReportImage.ImageTypeID from ReportImage 

        JOIN ReportWO on ReportWO.ReportWOID = ReportImage.ReportWOID

        JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID

        where ReportWO.WorkOrderID = ${req.query.WorkOrderID}
   
        `;
        pool.query(query, function (err, results) {
            if (err) reject(err)

            //return empty array even there is no images
            resolve(results);


        })

    });

}


function getFindings(req) {
    return new Promise((resolve, reject) => {
        var allData;
        let query = `
        SELECT DISTINCT ReportWOFindings.FindingsID, ReportWOFindings.Value, ReportWOFindings.IsChecked,
ReportWOFindings.UpdatedByUserID, ReportWOFindings.UpdatedDateTime
from ReportWOFindings
JOIN ReportWO on ReportWO.ReportWOID = ReportWOFindings.ReportWOID
 JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID
 WHERE WorkOrder.WorkOrderID = ${req.query.WorkOrderID}
        `
        pool.query(query, function (err, results) {
            if (err) reject(err)
            console.log(results)
            if (results.length == 0) {
                resolve({ code: 200, message: "There is no findings  for selected values" });
            }
            allData = results;
            console.log("all results are --->" + allData);
            resolve(results);


        })

    });
}

function getServices(req) {
    return new Promise((resolve, reject) => {
        var allData;
        let query = `
        select DISTINCT ServiceType.ServiceName from ReportWOService
        JOIN ReportWO ON ReportWO.ReportWOID = ReportWOService.ReportWOID
        JOIN WorkOrder ON WorkOrder.WorkOrderID = ReportWO.WorkOrderID
        JOIN ServiceType ON ServiceType.ServiceID = ReportWOService.ServiceID
           where WorkOrder.WorkOrderID = ${req.query.WorkOrderID}`
        pool.query(query, function (err, results) {
            if (err) reject(err)
            console.log(results)
            if (results.length == 0) {
                resolve({ code: 200, message: "There is no service name for selected values" });
            }
            allData = results;
            console.log("all results are --->" + allData);
            resolve(results);


        })

    });
}

function getWorkersData(req) {
    return new Promise((resolve, reject) => {
        let workersQuery = `
         SELECT 
         Staff.StaffName
         FROM WorkOrderStaff
         JOIN Staff on Staff.StaffID = WorkOrderStaff.StaffID
         where WorkOrderID = ${req.query.WorkOrderID} `;
        pool.query(workersQuery, function (err, workersResults) {
            if (err)
                throw err
            if (workersResults.length >= 0) {

                resolve(workersResults);
            } else {
                reject({ code: 200, message: "There is no workers data for selected values" });
            }

        });
    })

};


function getAllData(req) {
    return new Promise((resolve, reject) => {
        var allData;
        let query = `
        select DISTINCT ReportWO.WorkOrderID,ReportWO.WOstartDateTime, ReportWO.WOendDateTime, WorkNature.WorkNature, ReportWO.Findings, ReportWO.Location,
        ReportWO.ContactAckSignImageURL,C2.ContactName AS Requestor, WorkOrder.POID ,ReportWO.ContactAckDateTime,
              ReportWO.ContackAckOther, ReportWO.ContactAckID, PO.POnumber, ReportWO.FogMachineNum, PO.PODate, Site.SiteName,
              (CASE WHEN (C1.ContactName != "" OR C1.ContactName != 0) THEN C1.ContactName ELSE ReportWO.ContackAckOther END) AS AckContact 
              from ReportWO
              JOIN WorkNature on WorkNature.WorkNatureID = ReportWO.WorkNatureID
              LEFT JOIN Contact C1 on C1.ContactID = ReportWO.ContactAckID
              JOIN WorkOrder on WorkOrder.WorkOrderID = ReportWO.WorkOrderID
              JOIN Site ON Site.SiteID = WorkOrder.SiteID
              JOIN PO ON PO.POID = WorkOrder.POID
              JOIN Contact C2 on C2.ContactID = PO.ContactID
              WHERE ReportWO.WorkOrderID = ${req.query.WorkOrderID}`
        pool.query(query, function (err, results) {
            if (err) reject(err)
            if (results.length == 0) {
                reject({ code: 200, message: "There is no report data for selected values" });
            }
            allData = results;
            resolve(results);
        })


    });

}

app.post('/rescheduledReportWO', multer.single('file'), async (req, res) => {

    if (req.body["ContactAckSignImageURL"]) {
        const buffer = Buffer.from(req.body["ContactAckSignImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });

        blobStream.on('finish', () => {
            // The public URL can be used to directly access the file via HTTP.
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            let query = 'INSERT INTO Site(`RescheduledReportWOID`,`ReportWOID`,`WorkOrderID`,`WOstartDateTime`,`WOendDateTime`,`WorkNatureID`,`Findings`,`Location`,`ServiceMethodID`,`FogMachineNum`,`ContactAckMethodID`,`ContactAckID`,`ContackAckOther`,`ContactAckSignImageURL`,`ContactAckDateTime`,`consolidateDateTime`,`Notes`,`Reason`,`UpdatedUserID`,`UpdatedDateTime`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            let parameters = ["", req.body.ReportWOID, req.body.WorkOrderID, req.body.WOstartDateTime, req.body.WOendDateTime, req.body.WorkNatureID, req.body.Findings, req.body.Location, req.body.ServiceMethodID, req.body.FogMachineNum, req.body.ContactAckMethodID, req.body.ContactAckID, req.body.ContackAckOther, publicUrl, req.body.ContactAckDateTime, req.body.consolidateDateTime, req.body.Notes, req.body.Reason, req.body.UpdatedUserID, req.body.UpdatedDateTime]
            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "success" })
                } else {
                    return res.status(401).json({ code: 401, "message": "data not inserted." })
                }
            })
        })
        blobStream.end(buffer);
    }
    else {
        let query = 'INSERT INTO Site(`RescheduledReportWOID`,`ReportWOID`,`WorkOrderID`,`WOstartDateTime`,`WOendDateTime`,`WorkNatureID`,`Findings`,`Location`,`ServiceMethodID`,`FogMachineNum`,`ContactAckMethodID`,`ContactAckID`,`ContackAckOther`,`ContactAckSignImageURL`,`ContactAckDateTime`,`consolidateDateTime`,`Notes`,`Reason`,`UpdatedUserID`,`UpdatedDateTime`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        let parameters = ["", req.body.ReportWOID, req.body.WorkOrderID, req.body.WOstartDateTime, req.body.WOendDateTime, req.body.WorkNatureID, req.body.Findings, req.body.Location, req.body.ServiceMethodID, req.body.FogMachineNum, req.body.ContactAckMethodID, req.body.ContactAckID, req.body.ContackAckOther, req.body.ContactAckSignImageURL, req.body.ContactAckDateTime, req.body.consolidateDateTime, req.body.Notes, req.body.Reason, req.body.UpdatedUserID, req.body.UpdatedDateTime]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err
            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "data not inserted." })
            }
        })
    }

})

app.get("/getRescheduledReason", async (req, res) => {

    let query = `SELECT * from RescheduledReason ORDER BY ReasonName`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).send(results)
        } else {
            return res.status(403).json({ code: 403, message: "No data available." })
        }

    })
});


app.get("/getHomeData", async (req, res) => {
    var totalWorkOrders = getTotalWorkOrders(req);
    var newWorkOrders = getNewWorkOrders(req);
    var inProgressWorkOrders = getInProgressWorkOrders(req);
    var closedWorkOrders = getClosedWorkOrders(req);
    var completedWorkOrders = getCompletedWorkOrders(req);
    var assignedWorkOrders = getAssignedWorkOrders(req);

    Promise.all([
        totalWorkOrders,
        newWorkOrders,
        inProgressWorkOrders,
        closedWorkOrders,
        completedWorkOrders,
        assignedWorkOrders
    ])
        .then((allData) => {
            var returnObject = [];
            console.log(allData[0][0]);
            console.log(allData[1][0]);
            console.log(allData[2][0]);
            for (var i = 0; i < 6; i++) {
                var singleData = allData[i][0];
                returnObject.push(singleData);
            }

            return res.status(200).send(returnObject);
        })
        .catch((err) => {
            return res.status(200).send(err);
        });
});

app.post('/testVerify', async(req, res) => {

    var token = jwt.sign({email_id:'123@gmail.com'}, "Stack", {

        expiresIn: '2d' // expires in 2 days

   });

   jwt.verify(token, 'publicKey', function(err, decoded) {
    if (err) {
      console.log(err);
    } else {
        console.log(decoded);
    }
  });

});

app.put("/updatePassword", async (req, res) => {
  var contactPasswordUpdate = updateContactPasswordPromise(req);
  var staffPasswordUpdate = updateStaffPasswordPromise(req);
  Promise.all([contactPasswordUpdate, staffPasswordUpdate]).then((allData) => {
    var contact = allData[0];
    var staff = allData[1];
    if (contact==1) {
      console.log("Inside contact forgot password token verify.");
      var deleteContactToken = deleteContactTokenPromise(req);
      deleteContactToken.then((data) => {
        return res.status(200).send({
            code: 200,
            status: true,
          });
      }).catch(err =>{
        return res.status(200).send({
            code: 200,
            status: false,
          });
      })
      
    } else if (staff==1) {
      console.log("Inside staff forgot password token verify.");
      var deleteStaffToken = deleteStaffTokenPromise(req);
      deleteStaffToken.then((data) => {
        return res.status(200).send({
            code: 200,
            status: true,
          });
      }).catch(err =>{
        return res.status(200).send({
            code: 200,
            status: false,
          });
      })
      
    } else {
      return res.status(200).send({
        code: 200,
        status: false,
      });
    }
  })
  .catch((err) => {
    console.log("error ********* update password" + err);
    return res.status(400).send(err);
  });
});

function deleteContactTokenPromise(req) {
    var decoded = jwt.verify(req.body.token, 'publicKey');
    return new Promise((resolve, reject) => {
        let query = `
        update Contact

set PassToken = ''
where Email1 = '${decoded.email_id}'
`;
        pool.query(query, function (err, results) {
          if (err) throw err;
          if (results.affectedRows > 0) {
            resolve("new password updated for contact success")
        } else {
            resolve("new password updated for contact fail")
        }
        });
    })
}
function deleteStaffTokenPromise(req) {
    var decoded = jwt.verify(req.body.token, 'publicKey');
    return new Promise((resolve, reject) => {
        let query = `
        update Staff
set PassToken = ''
where Email = '${decoded.email_id}'
`;
        pool.query(query, function (err, results) {
          if (err) throw err;
          if (results.affectedRows > 0) {
            resolve("new password updated for contact success")
        } else {
            resolve("new password updated for contact fail")
        }
        });
    })
}

function updateContactPasswordPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `
        UPDATE Contact

set PasswordHash = '${req.body.password}'

where PassToken = '${req.body.token}'
`;
        pool.query(query, function (err, results) {
          if (err) throw err;
          if (results.affectedRows > 0) {
            resolve(results.affectedRows)
        } else {
            resolve(results.affectedRows)
        }
        });
    })
}


function updateStaffPasswordPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `
        UPDATE Staff

set PasswordHash = '${req.body.password}'

where PassToken = '${req.body.token}'
        
        `
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.affectedRows > 0) {
                resolve(results.affectedRows)
            } else {
                resolve(results.affectedRows)
            }

        })
    })
}
app.get('/verifyToken', async(req, res) => {

    jwt.verify(req.query.token, "publicKey", function (err, decoded) {
      if (err) {
        return res.status(200).send({
            code: 200,
            status:false
          });
      }

      var contactCheck = contactTokenCheckPromise(req);
      var staffCheck = staffTokenCheckPromise(req);
      Promise.all([contactCheck, staffCheck]).then((allData) => {
        var contact = allData[0];
        var staff = allData[1];
        if (contact && contact.length > 0) {
          console.log("Inside contact forgot password token verify.");
          return res.status(200).send({
            code: 200,
            status:true
          });
        } else if (staff && staff.length > 0) {
          console.log("Inside staff forgot password token verify.");
          return res.status(200).send({
            code: 200,
            status:true
          });
        } else {
            return res.status(200).send({
                code: 200,
                status:false
              });
        }
      });
    });
});

function contactTokenCheckPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `select * from Contact WHERE Contact.PassToken = '${req.query.token}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
}
function staffTokenCheckPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `select * from Staff WHERE Staff.PassToken = '${req.query.token}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
}

app.post('/forgotPassword', async(req, res) => {

    var checkInContactPromise = contactCheckPromise(req);
    var checkInStaffPromise = staffCheckPromise(req);
    Promise.all([checkInContactPromise, checkInStaffPromise])
      .then((allData) => {
       
        var contact = allData[0];
        var staff = allData[1];
        if (contact && contact.length > 0) {
          console.log("Inside contact forgot password");
          var updateContactTokenPromise = updateContactToken(contact[0]);
        } else if(staff && staff.length > 0) {
          console.log("Inside staff forgot password");
          var updateStaffTokenPromise = updateStaffToken(staff[0]);
        }
        if (updateContactTokenPromise) {
          updateContactTokenPromise
            .then((data) => {
              console.log("inside return promise contact" + contact[0].Email1);
              var sendEmailForContact = mailOperations.sendEmail(contact[0].Email1, data.token);
              sendEmailForContact.then((data) => {
                return res
                .status(200)
                .send({ code: 200, message: "Mail has been delivered successfully to "+ contact[0].Email1});
              }).catch((err) => {
                return res
                .status(200)
                .send({ code: 200, message: "Failed to send mail to "+ contact[0].Email1 +" "+ err});
              });
            })
            .catch((err) => {
              console.log("error ********* contact update" + err);
            });
        }
        if (updateStaffTokenPromise) {
          updateStaffTokenPromise
            .then((data) => {
              console.log("inside return promise staff");
              var sendEmailForContact = mailOperations.sendEmail(staff[0].Email, data.token);
              sendEmailForContact.then((data) => {
                return res
                .status(200)
                .send({ code: 200, message: "Mail has been delivered successfully to "+ staff[0].Email});
              }).catch((err) => {
                return res
                .status(200)
                .send({ code: 200, message: "Failed to send mail to "+ contact[0].Email1 +" "+ err});
              });
            })
            .catch((err) => {
              console.log("error ********* staff update" + err);
            });
        }
        
        if(updateContactTokenPromise == undefined && updateStaffTokenPromise == undefined) {
            return res
                .status(200)
                .send({ code: 200, message: "Email is not registered with us "+ req.body.email});
              
        }
        
      })
      .catch((err) => {
        console.log("error ********* outside" + err);
        return res.status(200).send(err);
      });
   
});

function updateContactToken(contactInfo) {
    
    var token = jwt.sign({email_id: contactInfo.Email1}, "publicKey", {

        expiresIn: '2d' // expires in 2 days

   });
    return new Promise((resolve, reject) => {
        let query = `update Contact

        set PassToken = '${token}'
        
        where Email1 = '${contactInfo.Email1}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            resolve({token: token})
        })
    })
    
}


function updateStaffToken(staffInfo) {
    var token = jwt.sign({email_id: staffInfo.Email}, "publicKey", {

        expiresIn: '2d' // expires in 2 days

   });
    return new Promise((resolve, reject) => {
        let query = `update Staff

        set PassToken = '${token}'
        
        where Email = '${staffInfo.Email}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            resolve({token: token})

        })
    })
}


function contactCheckPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `select * from Contact WHERE Contact.Email1 = '${req.body.email}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
}
function staffCheckPromise(req) {
    return new Promise((resolve, reject) => {
        let query = `select * from Staff WHERE Staff.Email = '${req.body.email}'`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
}


function getTotalWorkOrders(req) {
    return new Promise((resolve, reject) => {
        let query = `SELECT  "totalWorkOrders" as title,COUNT(*) AS Value FROM WorkOrder WHERE DATE(AssignedDateTime) = DATE(${req.query.CurrentDate})`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
};

function getNewWorkOrders(req) {
    return new Promise((resolve, reject) => {
        let query = `SELECT  "newWorkOrders" as title,COUNT(*) AS Value FROM WorkOrder WHERE DATE(AssignedDateTime) = DATE(${req.query.CurrentDate}) AND WorkStatusID = 1`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
};

function getInProgressWorkOrders(req) {
    return new Promise((resolve, reject) => {
        let query = `SELECT  "inProgressWorkOrders" as title,COUNT(*) AS Value FROM WorkOrder WHERE DATE(AssignedDateTime) = DATE(${req.query.CurrentDate}) AND WorkStatusID = 3`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                resolve(results)
            } else {
                resolve(results)
            }

        })
    })
};

function getClosedWorkOrders(req) {
    return new Promise((resolve, reject) => {
        let query = `SELECT  "closedWorkOrders" as title,COUNT(*) AS Value FROM WorkOrder WHERE DATE(AssignedDateTime) = DATE(${req.query.CurrentDate}) AND WorkStatusID = 5`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                return resolve(results)
            } else {
                return resolve(results)
            }

        })
    })
};

function getCompletedWorkOrders(req) {
    return new Promise((resolve, reject) => {
        let query = `SELECT  "Completed" as title,COUNT(*) AS Value FROM WorkOrder WHERE DATE(AssignedDateTime) = DATE(${req.query.CurrentDate}) AND WorkStatusID = 4`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                return resolve(results)
            } else {
                return resolve(results)
            }

        })
    })
};

function getAssignedWorkOrders(req) {
    return new Promise((resolve, reject) => {
        let query = `SELECT  "Assigned" as title,COUNT(*) AS Value FROM WorkOrder WHERE DATE(AssignedDateTime) = DATE(${req.query.CurrentDate}) AND WorkStatusID = 2`
        pool.query(query, function (err, results) {
            if (err) throw err
            if (results.length > 0) {
                return resolve(results)
            } else {
                return resolve(results)
            }

        })
    })
};

app.get('/getHomeWorkOrder', async (req, res) => {
    let query = `Select WorkOrder.*,Site.SiteName,WorkType.WorkTypeName,WorkStatus.WorkStatus,SiteZone.Description,Staff.StaffName,Staff.StaffID from WorkOrder
    JOIN PO ON PO.POID = WorkOrder.POID
    JOIN Staff ON Staff.StaffID = PO.StaffID
    JOIN Site ON Site.SiteID = WorkOrder.SiteID
    JOIN SiteZone ON SiteZone.SiteZoneID = WorkOrder.SiteZoneID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    WHERE DATE(WorkOrder.AssignedDateTime) = DATE(${req.query.CurrentDate})
    ORDER BY WorkOrder.WorkOrderID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(200).json({ code: 200, message: "No data found for today." })
        }
    })
})
app.get('/getHomeWorkOrderForContactOrStaff', async (req, res) => {
    if (req.body.isStaff) {
      let query = `Select WorkOrder.*,Site.SiteName,WorkType.WorkTypeName,WorkStatus.WorkStatus,SiteZone.Description,Staff.StaffName,Staff.StaffID from WorkOrder
    JOIN PO ON PO.POID = WorkOrder.POID
    JOIN Staff ON Staff.StaffID = PO.StaffID
    JOIN Site ON Site.SiteID = WorkOrder.SiteID
    JOIN SiteZone ON SiteZone.SiteZoneID = WorkOrder.SiteZoneID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    WHERE DATE(WorkOrder.AssignedDateTime) = DATE('${req.query.CurrentDate}') and PO.StaffID = ${req.body.userId}
    ORDER BY WorkOrder.WorkOrderID`;
      pool.query(query, function (err, results) {
        if (err) throw err;
        if (results.length > 0) {
          return res.status(200).json(results);
        } else {
          return res
            .status(200)
            .json({ code: 200, message: "No data found for today." });
        }
      });
    } else {
      let query = `
    Select WorkOrder.*,Site.SiteName,WorkType.WorkTypeName,WorkStatus.WorkStatus,SiteZone.Description,Contact.ContactName,Contact.ContactID from WorkOrder
    JOIN PO ON PO.POID = WorkOrder.POID
    JOIN Contact ON Contact.ContactID = PO.ContactID
    JOIN Site ON Site.SiteID = WorkOrder.SiteID
    JOIN SiteZone ON SiteZone.SiteZoneID = WorkOrder.SiteZoneID
    JOIN WorkType ON WorkType.WorkTypeID = WorkOrder.WorkTypeID
    JOIN WorkStatus ON WorkStatus.WorkStatusID = WorkOrder.WorkStatusID
    WHERE DATE(WorkOrder.AssignedDateTime) = DATE('${req.query.CurrentDate}') and PO.ContactID = ${req.body.userId}
    ORDER BY WorkOrder.WorkOrderID
    `;
      pool.query(query, function (err, results) {
        if (err) throw err;
        if (results.length > 0) {
          return res.status(200).json(results);
        } else {
          return res
            .status(200)
            .json({ code: 200, message: "No data found for today." });
        }
      });
    }
})



//POInvoice to insert and delete and read 
app.get('/poInvoice', async (req, res) => {
    pool.query(`select * from POInvoice`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})
app.put('/poInvoice', async (req, res) => {
    let detail = req.body;
    let query = `Update POInvoice SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where POInvoiceID = ?"
    const parameters = [...Object.values(detail), req.query.POInvoiceID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err

        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ code: 401, "message": "sitezone without data not update" })
        }
    })
})

app.post('/poInvoice', async (req, res) => {
    let query = "INSERT INTO `POInvoice`(`POInvoiceID`, `POID`, `Invoice`) VALUES (?,?,?)"
    let parameters = ["", req.body.POID, req.body.Invoice]
    pool.query(query, parameters, function (error, results) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "POInvoice inserted success" })
        } else {
            return res.status(401).json({ code: 401, "message": "POInvoice data not insert" })
        }
    })
})

app.delete('/poInvoice', async (req, res) => {

    let query = `DELETE FROM POInvoice WHERE POInvoiceID = ${req.query.POInvoiceID} `
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

app.post('/team', async(req, res) => {

    let staffs = req.body.staffs;
    delete req.body["staffs"];
    let query = "INSERT into Team(TeamID, TeamName, UpdatedByUserID, UpdatedDateTime) VALUES(?,?,?,?)"
    let parameters = ["", req.body.TeamName, req.body.UpdatedByUserID, req.body.UpdatedDateTime]
    pool.query(query, parameters, function (error, results, fields) {
      if (error) throw error;
      if (results.affectedRows > 0) {
        var staffsPromise = insertStaffDetailsForTeams(
          results.insertId,
          staffs
        );
        Promise.all([staffsPromise])
          .then((allData) => {

            return res.status(200).send({ code: 200, message: "Team data inserted" });
          })
          .catch((err) => {
            console.log("error while get teams *********" + err);
            return res.status(400).send(err);
          });
      } else {
        return res
          .status(401)
          .json({ code: 401, message: "Team data not insert" });
      }
    });
});

function insertStaffDetailsForTeams(teamId, staffs) {
  return new Promise((resolve, reject) => {
    let staffQuery =
      "INSERT into TeamStaff (TeamID, StaffID, UpdatedByUserID) VALUES ?";
    let values = [];
    for (var i = 0; i < staffs.length; i++) {
      staffs[i].TeamID = teamId;
      let value = [];
      value.push(teamId);
      value.push(staffs[i].StaffID);
      value.push(staffs[i].UpdatedByUserID);
      values.push(value);
    }

    pool.query(staffQuery, [values], function (error, results) {
      if (error) throw error;
      resolve("staff data inserted")
    });
  });
}
app.get('/team', async(req, res) => {

    var allTeams = getTeamsPromis();
    var allStaffs = getStaffsPromise();
    Promise.all([allTeams, allStaffs])
      .then((allData) => {
        var teamsData = allData[0];
        var staffsData = allData[1];
        var returnData = [];
        var singleData = {};
        for (var i = 0; i < teamsData.length; i++) {
          var staffsForTeam = [];
          for (var j = 0; j < staffsData.length; j++) {
            var singleStaff = {};
            if (staffsData[j].TeamID === teamsData[i].TeamID) {
              singleStaff = staffsData[j];
              staffsForTeam.push(singleStaff);
            }
          }
          singleData = teamsData[i];
          singleData.staffs = staffsForTeam;
          returnData.push(singleData);
        }
        return res.status(200).send(teamsData);
      })
      .catch((err) => {
        console.log("error while get teams *********" + err);
        return res.status(400).send(err);
      });
});

function getTeamsPromis() {
  return new Promise((resolve, reject) => {
      let query  =`
      SELECT * from Team

      `;
    pool.query(query, function (error, results) {
      if (error) throw error;
      resolve(results);
    });
  });
}
function getStaffsPromise() {
  return new Promise((resolve, reject) => {
      let query = `
      SELECT TeamStaff.TeamStaffID, TeamStaff.TeamID, TeamStaff.StaffID, TeamStaff.UpdatedByUserID, Staff.StaffName FROM TeamStaff
join Staff on Staff.StaffID = TeamStaff.StaffID
      `;
    pool.query(query, function (error, results) {
      if (error) throw error;
      resolve(results);
    });
  });
}


app.put("/team", async (req, res) => {
  let staffs = req.body.staffs;
  delete req.body["staffs"];
  var staffDeletePromise = deleteStaffsForTeam(req);
  Promise.all([staffDeletePromise])
    .then((allData) => {
      var updateTeamPromise = updateTeamData(req);
      var insertStaffPromise = insertStaffDetailsForTeams(req.query.TeamID, staffs);
      Promise.all([updateTeamPromise, insertStaffPromise])
        .then((allData) => {
            return res.status(200).send(({ code: 200, message: "updated teams successfully" }));
        })
        .catch((err) => {
          console.log("error while update teams *********" + err);
          return res.status(400).send(err);
        });
    })
    .catch((err) => {
      console.log("error while update teams outside *********" + err);
      return res.status(400).send(err);
    });
});

function updateTeamData(req) {
    let detail = req.body;
    return new Promise((resolve, reject) => {
        let query = `Update Team SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where TeamID = ?"
        const parameters = [...Object.values(detail), req.query.TeamID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err
            if (results.affectedRows > 0) {
                resolve({ code: 200, message: "success" })
            } else {
                reject({ code: 401, "message": "TeamID  data not updated" })
            }
        })
    });
}
function deleteStaffsForTeam(req) {
    return new Promise((resolve, reject) => {
        let query = `
        Delete From TeamStaff where TeamID=${req.query.TeamID}
        `;
      pool.query(query, function (error, results) {
        if (error) throw error;
        resolve("Deleted Staffs for current staff")
      });
    });
}

app.delete('/team', async (req, res) => {

    let query = `delete from TeamStaff where TeamID = ${req.query.TeamID}`
    pool.query(query, function (error, results, fields) {
      if (error) throw error;
      let query = `DELETE FROM Team WHERE TeamID = ${req.query.TeamID} `;
      pool.query(query, function (error, results, fields) {
        if (error) throw error;
        if (results.affectedRows > 0) {
          return res
            .status(200)
            .json({ code: 200, message: "deleted successfully" });
        } else {
          return res
            .status(401)
            .json({ code: 401, message: "unauthorized user for team" });
        }
      });
      
    });
})

app.post('/bulkWorkOrder', async (req, res) => {

    let bulkWorkOrder = bulkInsertWorkOrderPromise(req);
    Promise.all([bulkWorkOrder]).then(data =>{
        return res.status(200).send(({ code: 200, message: "inserted bulk workorder successfully" }));
    }).catch(err =>{
        console.log("error occured in bulk work order insert=====" + err);
        return res.status(400).send(({ code: 400, message: "inserted bulk workorder failed" }));
    })

})

function bulkInsertWorkOrderPromise(req) {
    return new Promise((resolve, reject) => {
        if(req.body.length == 0) {
            resolve("No work orders to insert");
            return;
        }
      let values = [];

      for (let data of req.body) {
        let value = [];
        value.push(data.POID);
        value.push(data.SiteID);
        value.push(data.TeamID);
        value.push(data.WorkTypeID);
        value.push(data.CreatedType !=null ? data.CreatedType : "M");
        value.push(data.RequestedStartDate);
        value.push(data.RequestedEndDate);
        value.push(data.WorkStatusID);
        value.push(data.AssignedDateTime);
        value.push(data.UpdatedByUserID);
        value.push(data.UpdatedDateTime);
        value.push(data.SiteZoneID);
        value.push(data.WorkNatureID);
        values.push(value);
      }

      var sql =
        "INSERT INTO WorkOrder(POID, SiteID, TeamID, WorkTypeID, CreatedType, RequestedStartDate,RequestedEndDate,WorkStatusID, AssignedDateTime,UpdatedByUserID,UpdatedDateTime,SiteZoneID,WorkNatureID) VALUES ?";

      pool.query(sql, [values], function (err, result) {
        if (err) throw err;
        if (result.affectedRows > 0) {
            var updateWorkOrderStaffPromise = updatedWorkOrderStaffForBulkOrder(req, result.insertId);
            Promise.all([updateWorkOrderStaffPromise]).then(allData => {
                resolve(result)
            }).catch(err => {
                reject("Error occured while updating work order staff")
            })
        
        } else {
            resolve(result)
        }
      });
    });
}

function updatedWorkOrderStaffForBulkOrder(req, workOrderId){
    return new Promise((resolve, reject) => {
        for(var singleData of req.body) {
            var getWorkersFromTeam = getWorkersFromTeamPromise(singleData.TeamID);

            Promise.all([getWorkersFromTeam]).then(data => {
                var staffIds = [];
                for(var m=0; m<data[0].length; m++) {
                    staffIds.push(data[0][m].StaffID);
                }
                if (staffIds.length > 0) {
    
                    let sql = `DELETE FROM WorkOrderStaff WHERE WorkOrderID = ${workOrderId} AND StaffID NOT IN (${staffIds})`
                    pool.query(sql, function (err, result, fields) {
                        if (err) throw err;
                        if (result.length > 0) {
                            console.log(result)
                        } else {
                            console.log(result)
                        }
                    })
        
                    for (let woWorker of staffIds) {
                        //console.log(woValues)
        
        
                        let sql = `SELECT 1 FROM WorkOrderStaff WHERE WorkOrderID = ${workOrderId} AND StaffID = ${woWorker}`
                        pool.query(sql, function (err, result, fields) {
                            if (err) throw err;
                            if (result.length > 0) {
                               resolve({ code: 200, "message": "Update workOrder Successful." })
                            }
                            else {
                                var sql = "INSERT INTO WorkOrderStaff(WorkOrderID, StaffID, AddedByUserID, AddedDateTime) VALUES (?,?,?,?)";
                                let parameters = [workOrderId, woWorker, singleData.UpdatedByUserID, singleData.UpdatedDateTime]
                                pool.query(sql, parameters, function (err, result, fields) {
                                    if (err) throw err;
                                    if (result.affectedRows > 0) {
                                                                            
                                        resolve({ code: 200, "message": "Update workOrder Successful." })
                                        
                                    }
                                    else {
                                        reject({ code: 401, "message": "New work order staff not updated." })
                                    }
                                });
                            }
                        })
                    }
        
                }
                else {
                    let sql = `SELECT 1 FROM WorkOrderStaff WHERE WorkOrderID = ${workOrderId}`
                    pool.query(sql, function (err, result, fields) {
                        if (err) throw err;
                        if (result.length > 0) {
                            let sql = `DELETE FROM WorkOrderStaff WHERE WorkOrderID = ${workOrderId}`
                            pool.query(sql, function (err, result, fields) {
                                if (err) throw err;
                                if (result.length > 0) {
                                    console.log(results)
                                } else {
                                    reject({ code: 200, "message": "No workers present to be removed." })
                                }
                            })
                        }
                    })
                }
            }).catch((err) => {
                console.log("error while updating work order is ====" + err);
                reject(err);
            });
        }
        
          
    })
}
app.listen(port, function () {
    console.log(`${port} is running`)
})

