
const express = require('express')
const uuid = require('uuid')
const base = require('./base64.json')
const { format } = require('util')
const cors = require('cors')
const Multer = require('multer')
const path = require('path')
const bodyParser = require('body-parser')
const app = express()

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

app.use('/uploads', express.static('uploads'))

//mysql 
const mysql = require('mysql');

const pool = mysql.createPool({
    host: '184.168.117.92',
    user: 'userCreation',
    password: 'Vp6f}9)U?u)r',
    database: 'PEST',
})

const port = process.env.PORT || 3001

pool.query(`SELECT 1 + 1 AS solution`, function (error, results, fields) {
    if (error) throw error;
});


app.get('/', function (req, res) {
    res.json({ "name": "Raghul" })
})

app.post('/authentication', async (req, res) => {

    pool.query(`SELECT * from login where username=? AND password=?`, [req.body.username, req.body.password], function (error, results, fields) {
        if (results.length > 0) {
            return res.status(200).json(results[0])
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

/* Site API to create ,update and inssert and delete */

app.get('/site', async (req, res) => {
    pool.query(`SELECT SiteName, Address1,SiteType.Description AS SiteType ,SiteZone.Description AS SiteZone,IsNFCAvailable,PostCode,Site.* FROM Site
    JOIN SiteType ON SiteType.SiteTypeID = Site.SiteTypeID
    JOIN SiteZone ON SiteZone.SiteZoneID = Site.SiteZoneID`, function (error, results, fields) {
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
        let query = 'INSERT INTO Site(`SiteID`, `SiteName`, `SiteStatus`, `Address1`, `Address2`, `IsNFCAvailable`, `PostCode`, `SiteZoneID`, `SiteTypeID`,`SiteMapImageURL`,`AddedByUserID`,`AddedDateTime`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'
        let parameters = ["", req.body.SiteName, req.body.SiteStatus, req.body.Address1, req.body.Address2, req.body.IsNFCAvailable, req.body.PostCode, req.body.SiteZoneID, req.body.SiteTypeID, publicUrl, req.body.AddedByUserID, req.body.AddedDateTime]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err
            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "data not update" })
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
                    return res.status(401).json({ code: 401, "message": "data not update" })
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
                return res.status(401).json({ code: 401, "message": "data not update" })
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

app.post('/sitezone', async (req, res) => {
    let query = "INSERT INTO `SiteZone`(`SiteZoneID`, `Description`) VALUES (?,?)"
    let parameters = ["", req.body.Description]
    pool.query(query, parameters, function (error, results) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ code: 401, "message": "data not update" })
        }
    })
})

app.delete('/sitezone', async (req, res) => {

    let query = `DELETE FROM SiteZone WHERE SiteZoneID = ${req.body.SiteZoneID} `
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
        let query = 'insert into Point_Details Values (?,?,?,?,?,?,?,?,?,?)';
        let parameters = ["", req.body.SiteZoneID, req.body.SiteID, req.body.PointNumber, req.body.PointNotes, req.body['UID'], req.body.IsScanned, publicUrl, req.body.AddedUserID, req.body.ScanDateTime]
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

app.put('/pointdetails', async (req, res) => {
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
                    return res.status(401).json({ code: 400, "message": "data not update" })
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
                return res.status(401).json({ code: 401, "message": "data not update" })
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
            return res.status(401).json({ "code": 400, "message": "not deleted scan details" })
        }
    })
})

/* contact API to create,update and insert*/

app.get('/contact', async (req, res) => {

    pool.query(`select * from Contact`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })

})

app.post('/contact', async (req, res) => {
    pool.query(`insert into Contact(ContactID, SalutationID,ContactName, ContactTypeID, AccessControlID, Email1, Email2, CompanyName, BillingAddress1, BillingAddress2, Mobile, Telephone, BillingPOSTCode,AddedByUserID, AddedDateTime) Values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, ["", req.body.SalutationID, req.body.ContactName, req.body.ContactTypeID, req.body.AccessControlID, req.body.Email1, req.body.Email2, req.body.CompanyName, req.body.BillingAddress1, req.body.BillingAddress2, req.body.Mobile, req.body.Telephone, req.body.BillingPOSTCode, req.body.AddedByUserID, req.body.AddedDateTime], function (error, result, fields) {
        if (error) throw error;
        if (result.affectedRows > 0) {
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
                    return res.status(401).json({ code: 401, "message": "data not update" })
                }
            });

        }

    })
})

app.put('/contact', async (req, res) => {
    let contactSiteValues = req.body.LinkedSites
    let contactObjects = req.body
    delete contactObjects['LinkedSites']
    let query = `Update Contact SET  ` + Object.keys(req.body).map(key => `${key}=?`).join(",") + "where ContactID = ?"
    const parameters = [...Object.values(contactObjects), req.body.ContactID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err
        if (results.affectedRows > 0) {
            let query = `DELETE FROM Contact_Site WHERE ContactID =${req.body.ContactID}`
            pool.query(query, function (error, results, fields) {
                if (error) throw error

                if (results.affectedRows > 0) {

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

                    var sql = "INSERT INTO Contact_Site (ContactID, SiteID, AddedByUserID, AddedDateTime) VALUES ?";

                    pool.query(sql, [values], function (err, result) {
                        if (err) throw err;
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ code: 200, message: "success" })
                        }
                        else {
                            return res.status(401).json({ code: 401, "message": "data not update" })
                        }
                    });
                } else {
                    return res.status(401).json({ "code": 401, "message": "unauthorized user" })
                }
            })
        } else {
            return res.status(401).json({ code: 401, "message": "data not update" })
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

    pool.query(`SELECT Staff.*,AccessControl.AccessControl,StaffTitle.StaffTitle,StaffEmploymentStatus.StaffEmploymentStatus AS EmploymentStatus FROM Staff 
    JOIN AccessControl ON AccessControl.AccessControlID = Staff.AccessControlID
    JOIN StaffTitle ON StaffTitle.StaffTitleID = Staff.StaffTitleID
    JOIN StaffEmploymentStatus ON StaffEmploymentStatus.StaffEmploymentStatusID = Staff.StaffEmploymentStatusID`, function (error, results, fields) {
        if (error) throw error;
        if (results.length > 0) {

            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
        }
    })
})

app.post('/staff', multer.single('file'), async (req, res) => {

    const buffer = Buffer.from(req.body["StaffImageURL"], 'base64')
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
        let query = `INSERT INTO Staff(StaffID, StaffName, GenderID,SalutationID,StaffTitleID, StaffImageURL,Email, StaffEmploymentType, StaffEmploymentStatusID,Mobile,Telephone,Address1, Address2, PostCode, Nationality, JobStartDate, JobEndDate,IDTypeID, ID, Department,Passport, NextOfKin, NextOfKinMobile, RelationshipID, DOB, MartialStatusID,HighestQualification, Religion,PasswordHash, AccessControlID,AddedByUserID, AddedDateTime) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        pool.query(query, ["", req.body.StaffName, req.body.GenderID, req.body.SalutationID, req.body.StaffTitleID, publicUrl, req.body.Email, req.body.StaffEmploymentType, req.body.StaffEmploymentStatusID, req.body.Mobile, req.body.Telephone, req.body.Address1, req.body.Address2, req.body.PostCode, req.body.Nationality, req.body.JobStartDate, req.body.JobEndDate, req.body.IDTypeID, req.body.ID, req.body.Department, req.body.Passport, req.body.NextOfKin, req.body.NextOfKinMobile, req.body.RelationshipID, req.body.DOB, req.body.MartialStatusID, req.body.HighestQualification, req.body.Religion, req.body.PasswordHash, req.body.AccessControlID, req.body.AddedByUserID, req.body.AddedDateTime], function (error, results, fields) {
            if (error) return res.send(error);
            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "unauthorized user" })
            }
        })
    })
    blobStream.end(buffer);
})

app.put('/staff', async (req, res) => {

    const detail = req.body

    if (detail['StaffImageURL']) {

        const buffer = Buffer.from(detail["StaffImageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            next(err);
        });
        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            detail['StaffImageURL'] = publicUrl
            console.log(publicUrl)
            let query = `Update Staff SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where StaffID = ?"
            const parameters = [...Object.values(detail), req.query.StaffID]
            console.log(query)
            console.log(parameters)
            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, message: "success" })
                } else {
                    return res.status(401).json({ code: 401, "message": "data not update" })
                }
            })
        })
        blobStream.end(buffer);

    } else {

        let query = `Update Staff SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where StaffID = ?"
        const parameters = [...Object.values(detail), req.query.StaffID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err

            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(401).json({ code: 401, "message": "data not update" })
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

/*scandetails GET_POST*/

app.get('/checkscanid', async (req, res) => {

    var newDate = new Date()
    newDate.setHours(newDate.getHours() + 8)
    const uid = req.query.UID
    const userID = parseInt(req.query.userID)
    let query = `update Point_Details SET IsScanned = "1" where UID = '${uid}'`

    pool.query(query, function (error, results, fields) {
        if (error) throw error;
        if (results.affectedRows > 0) {
            pool.query(`select * from Point_Details where UID = '${uid}'`, function (error, results, fields) {
                if (results.length > 0) {
                    let pointID = results[0].PointID
                    let query = `INSERT INTO Scan_Details(ScanID, UID, PointID, UserID, ScanDateTime) VALUES (?,?,?,?,?)`
                    let parameters = ["", uid, pointID, userID, newDate]
                    pool.query(query, parameters, function (err, results) {
                        if (err) throw err
                        if (results.affectedRows > 0) {
                            return res.status(200).json({ code: 200, message: "success" })
                        } else {
                            return res.status(400).json({ code: 400, message: "Invalid Data" })
                        }
                    })
                }
            })


        } else {
            return res.status(401).json({ "code": 401, "message": "Invalid NFC ID." })
        }
    })

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
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": "No Data Available." })
        }
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
    const blob = bucket.file("konnect" + id + ".jpg");
    const blobStream = blob.createWriteStream();

    blobStream.on('error', err => {
        next(err);
    });

    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
        let query = 'INSERT INTO Staff_Certificate values (?,?,?,?,?,?,?,?,?)';
        let parameters = ["", req.body['StaffID'], req.body['Certification'], req.body['CertificationBody'], req.body['ValidityStartDate'], req.body['ValidityEndDate'], publicUrl, req.body['AddedByUserID'], req.body['AddedDateTime']]
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
    let query = `INSERT INTO SiteType (SiteTypeID,Description) VALUES (?,?)`
    let parameters = ["", req.body.Description]
    pool.query(query, parameters, function (error, results, fields) {
        if (error) throw error
        if (results.length > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ "code": 401, "message": "unauthorized user" })
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

/* imageUrl to store images and get */

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './uploads/')
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.originalname)
//     }
// })

// const fileFilter = (req, file, cb) => {
//     if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
//         cb(null, true)
//     } else {
//         cb(null, false)
//     }
// }

// const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 5 }, fileFilter: fileFilter })

// app.post('/imagesupload', upload.single('image'), (req, res) => {

//     let query = "INSERT INTO `imagesurl`(`imageurl`) VALUES (?)"
//     pool.query(query, req.file.path, function (err, results) {

//         if (err) throw err
//         if (results.affectedRows > 0) {
//             return res.status(200).json({ code: 200, message: "success" })
//         } else {
//             return res.status(401).json({ code: 401, "message": "unauthorized user" })
//         }

//     })
// })

// app.get('/imagesupload', async (req, res) => {

//     pool.query(`select * from imagesurl`, function (err, results, fields) {
//         if (err) throw err

//         if (results.length > 0) {
//             let demo = results.map(e => `https://konnect68.herokuapp.com/${e.imageurl}`)

//             return res.status(200).json(demo)
//         } else {
//             return res.status(401).json({ "code": 401, "message": results.imageurl })
//         }
//     })
// })

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
    // let pointQuery = `SELECT Point_Details.PointID,PointNumber FROM Point_Details
    // JOIN Site ON Point_Details.SiteID = Site.SiteID
    // WHERE Point_Details.SiteID =1 AND Point_Details.SiteZoneID=${req.query.SiteZoneID} AND Site.SiteTypeID = ${req.query.SiteTypeID}`

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

            // pool.query(pointQuery, function (err, pointQuery) {
            //     if (err) throw err
            //     obj['pointsData'] = pointQuery
            //     obj['ecsReports'] = results
            //     return res.status(200).send(obj)
            // })
            return res.status(200).send(results)

        } else {
            return res.status(400).json({ code: 400, message: "Invalid query" })
        }

    })

})

app.listen(port, function () {
    console.log(`${port} is running`)
})

