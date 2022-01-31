
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

    pool.query(`SELECT * from Contact`, function (error, listContacts, fields) {
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
                            return res.status(401).json({ code: 401, "message": "data not update" })
                        }
                    });
                }
                else
                    return res.status(200).json({ code: 200, message: "success" })
                /*} else {
                    return res.status(401).json({ "code": 401, "message": "unauthorized user" })
                }*/
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

    pool.query(`SELECT Staff.*,AccessControl.AccessControl,StaffTitle.StaffTitle,StaffEmploymentStatus.StaffEmploymentStatus AS EmploymentStatus,
    Staff_Certificate.CertTypeID,Staff_Certificate.CertBodyID,Staff_Certificate.ValidityStartDate,Staff_Certificate.ValidityEndDate,Staff_Certificate.CertificateImageURL 
    FROM Staff 
        JOIN AccessControl ON AccessControl.AccessControlID = Staff.AccessControlID
        JOIN StaffTitle ON StaffTitle.StaffTitleID = Staff.StaffTitleID
        JOIN StaffEmploymentStatus ON StaffEmploymentStatus.StaffEmploymentStatusID = Staff.StaffEmploymentStatusID
        LEFT JOIN Staff_Certificate ON Staff_Certificate.StaffID = Staff.StaffID
        ORDER BY Staff.StaffID`, function (error, results, fields) {
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
                const buffer1 = Buffer.from(req.body["CertificateImageURL"], 'base64')
                // Create a new blob in the bucket and upload the file data.
                const id1 = uuid.v4();
                const blob1 = bucket.file("konnect" + id1 + ".jpg");
                const blobStream1 = blob1.createWriteStream();
                blobStream1.on('error', err => {
                    next(err);
                });
                blobStream1.on('finish', () => {
                    const publicUrl1 = format(`https://storage.googleapis.com/${bucket.name}/${blob1.name}`);
                    var sql = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,CertificateImageURL,AddedByUserID,AddedDateTime) VALUES (?,?,?,?,?,?,?,?,?)";

                    pool.query(sql, ["", results.insertId, req.body.CertTypeID, req.body.CertBodyID, req.body.ValidityStartDate, req.body.ValidityEndDate, publicUrl1, req.body.AddedByUserID, req.body.AddedDateTime], function (err, result) {
                        if (err) throw err;
                        if (result.affectedRows > 0) {
                            return res.status(200).json({ code: 200, message: "Success." })
                        }
                        else {
                            return res.status(401).json({ code: 401, "message": "Data not inserted." })
                        }
                    });
                });
                blobStream1.end(buffer1);
            } else {
                return res.status(401).json({ code: 401, "message": "Data not inserted." })
            }
        })
    })
    blobStream.end(buffer);
})

app.put('/staff', async (req, res) => {

    const detail = req.body

    let values = [];
    values.push(req.body.CertTypeID)
    values.push(req.body.CertBodyID)
    values.push(req.body.ValidityStartDate)
    values.push(req.body.ValidityEndDate)
    values.push(req.body.CertificateImageURL)

    const staffObjects = req.body
    delete staffObjects['CertTypeID']
    delete staffObjects['CertBodyID']
    delete staffObjects['ValidityStartDate']
    delete staffObjects['ValidityEndDate']
    delete staffObjects['CertificateImageURL']
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
            let query = `Update Staff SET  ` + Object.keys(staffObjects).map(key => `${key}=?`).join(",") + " where StaffID = ?"
            const parameters = [...Object.values(staffObjects), req.body.StaffID]
            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                if (results.affectedRows > 0) {

                    let query = `DELETE FROM Staff_Certificate WHERE StaffID =${req.body.StaffID}`
                    pool.query(query, function (error, results, fields) {
                        if (error) throw error
                    })
                    if ((values[0] !== null) || (values[1] !== null) || (values[2] !== null) || (values[3] !== null) || (values[4] !== null)) {
                        const buffer1 = Buffer.from(values[4], 'base64')
                        // Create a new blob in the bucket and upload the file data.
                        const id1 = uuid.v4();
                        const blob1 = bucket.file("konnect" + id1 + ".jpg");
                        const blobStream1 = blob1.createWriteStream();
                        blobStream1.on('error', err => {
                            next(err);
                        });
                        blobStream1.on('finish', () => {
                            const publicUrl1 = format(`https://storage.googleapis.com/${bucket.name}/${blob1.name}`);
                            var sql = "INSERT INTO Staff_Certificate (StaffCertID,StaffID,CertTypeID,CertBodyID,ValidityStartDate,ValidityEndDate,CertificateImageURL,AddedByUserID,AddedDateTime) VALUES (?,?,?,?,?,?,?,?,?)";

                            pool.query(sql, ["", req.body.StaffID, values[0], values[1], values[2], values[3], publicUrl1, req.body.AddedByUserID, req.body.AddedDateTime], function (err, result) {
                                if (err) throw err;
                                if (result.affectedRows > 0) {
                                    return res.status(200).json({ code: 200, message: "Success." })
                                }
                                else {
                                    return res.status(401).json({ code: 401, "message": "Data not inserted." })
                                }
                            });
                        });
                        blobStream1.end(buffer1);
                    }
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
    let query = `INSERT INTO CertificateType (CertTypeID,CertTypeName, AddedByUser, AddedDateTime) VALUES (?,?,?,?)`
    let parameters = ["", req.body.CertTypeName, req.body.AddedByUser, req.body.AddedDateTime]
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
            return res.status(401).json({ code: 401, "message": "Data not updated." })
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
    let query = `INSERT INTO CertificateBody (CertBodyID,CertBodyName, AddedByUser, AddedDateTime) VALUES (?,?,?,?)`
    let parameters = ["", req.body.CertBodyName, req.body.AddedByUser, req.body.AddedDateTime]
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
            return res.status(401).json({ code: 401, "message": "Data not updated." })
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
                            return res.status(400).json({ code: 400, "message": "data not update" })
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
        let parameters = ["", req.body['StaffID'], req.body['CertTypeID'], req.body['CertBodyID'], req.body['ValidityStartDate'], req.body['ValidityEndDate'], publicUrl, req.body['AddedByUserID'], req.body['AddedDateTime']]
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
        return res.status(200).json(results)
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

app.get('/po', async (req, res) => {
    let query = `select PO.*,Contact.ContactName,Staff.StaffName from PO 
    JOIN Contact ON Contact.ContactID = PO.ContactID
    JOIN Staff ON Staff.StaffID = PO.StaffID
    ORDER BY POID`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(400).json({ code: 400, message: "No data found" })
        }
    })
})

app.post('/po', async (req, res) => {
    const buffer = Buffer.from(req.body["POImageURL"], 'base64')
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

        let query = `INSERT INTO PO(POID,POnumber,POdate,POimageURL,ContactID,StaffID, AddedbyUserID, AddedDateTime) VALUES(?,?,?,?,?,?,?,?)`
        pool.query(query, ["", req.body.POnumber, req.body.POdate, publicUrl, req.body.ContactID, req.body.StaffID, req.body.AddedByUserID, req.body.AddedDateTime], function (error, results) {
            if (error) return res.send(error);
            if (results.affectedRows > 0) {

                return res.status(200).send({ message: "Data uploaded successfUlly." })

            } else {
                return res.status(400).json({ code: 400, "message": "Data is not inserted." })
            }
        })
    })
    blobStream.end(buffer);
})

app.put('/po', async (req, res) => {

    const detail = req.body
    if (detail['POimageURL']) {

        const buffer = Buffer.from(detail["POimageURL"], 'base64')
        // Create a new blob in the bucket and upload the file data.
        const id = uuid.v4();
        const blob = bucket.file("konnect" + id + ".jpg");
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            throw(err);
        });
        blobStream.on('finish', () => {
            const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            detail['POimageURL'] = publicUrl
            let query = `Update PO SET  ` + Object.keys(req.body).map(key => `${key}=?`).join(",") + " where POID = ?"
            const parameters = [...Object.values(req.body), req.query.POID]
            pool.query(query, parameters, function (err, results, fields) {
                if (err) throw err
                
                if (results.affectedRows > 0) {
                    return res.status(200).json({ code: 200, "message": "Data is updated sucessfully" })

                } else {
                    return res.status(400).json({ code: 400, "message": "data not update" })
                }
            })
        })
        blobStream.end(buffer);

    } else {

        let query = `Update PO SET  ` + Object.keys(detail).map(key => `${key}=?`).join(",") + " where POID = ?"
        const parameters = [...Object.values(detail), req.query.POID]
        pool.query(query, parameters, function (err, results, fields) {
            if (err) throw err

            if (results.affectedRows > 0) {
                return res.status(200).json({ code: 200, message: "success" })
            } else {
                return res.status(400).json({ code: 400, "message": "data not update" })
            }
        })
    }

})

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
    let query = `select * from WorkOrder`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(400).json({ code: 400, message: "No data found" })
        }
    })
})

app.post('/workorder', async (req, res) => {

    let query = `Insert into WorkOrder values (?,?,?,?,?,?,?,?,?)`
    let parameters = ["", req.body.SiteID, req.body.WorkTypeID, req.body.RequestedStartDate, req.body.RequestedEndDate, req.body.AssignedDateTime, req.body.WorkStatusID, req.body.UpdatedByUserID, req.body.UpdatedDateTime]
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
    let query = "Update WorkOrder SET" + Object.keys(req.body).map(key => `${key}=?`).join(",") + `where WorkOrderID = ${req.query.WorkOrderID}`
    const parameters = [...Object.values(req.body), req.query.WorkOrderID]
    pool.query(query, parameters, function (err, results, fields) {
        if (err) throw err
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, "message": "Update Successful." })
        } else {
            return res.status(401).json({ code: 401, "message": "Data not updated." })
        }
    })
})

app.delete('/workorder', async (req, res) => {
    let query = `DELETE FROM WorkOrder WHERE WorkOrderID  =${req.query.WorkOrderID}`
    pool.query(query, function (error, results, fields) {
        if (error) throw error
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "deleted successfully" })
        } else {
            return res.status(400).json({ "code": 400, "message": "Given POinID is not there" })
        }

    })
})

app.get('/staffdetails', async (req, res) => {
    let query = `select StaffID,StaffName from Staff`
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
    let query = `select ContactID,ContactName from Contact`
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
    let query = `select SiteID,SiteName from Site`
    pool.query(query, parameters, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }
    })
})

app.get('/worktype', async (req, res) => {
    let query = `select WorkTypeID,WorkTypeName from WorkType`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }

    })
})

app.get('/workstatus', async (req, res) => {
    let query = `select WorkStatusID,WorkStatus from WorkStatus`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length >= 0) {
            return res.status(200).send(results)
        } else {
            return res.status(400).json({ code: 400, message: "Data is not there" })
        }
    })
})

app.listen(port, function () {
    console.log(`${port} is running`)
})

