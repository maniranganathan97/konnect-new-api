var express = require('express')
var mysql = require('mysql');
var fs = require("fs");
var formidable = require("formidable")

const pool = mysql.createPool({
    host: "184.168.117.92",
    user: 'userCreation',
    password: 'Vp6f}9)U?u)r',
    database: 'PEST',
})

const app = express()

var cat = {
    // img: fs.readFileSync("D:\\Learning\\konnect-apis\\uploads\\site.jpg"),
    //file_name: 'site'
}

app.post('/imageUpload', async (req, res) => {

    const allowedFileFormats = /\.(png|PNG|jpeg|JPEG|jpg|JPG)$/
    try {
        const form = new formidable.IncomingForm()
        let { fields, files, err } = await new Promise(function (resolve, reject) {
            form.parse(req, async (err, fields, files) => {
                resolve({ fields: fields, files: files, err: err })
            })
        })
        if (!(files['source'].originalFilename).match(allowedFileFormats)) {
            return res.status(400).json({ code: 400, message: "invalid file format" })
        }

        if ((files['source'].originalFilename).match(allowedFileFormats)) {
            cat['img'] = fs.readFileSync(files['source'].filepath)
            cat['file_name'] = files['source'].originalFilename
        }
        console.log(files['source'].mimetype)
        pool.query('INSERT INTO trn_image SET ?', cat, function (err, result) {

            if (result.affectedRows > 0) {

                return res.status(200).send({ message: "Image Uploaded SuccessFUlly" })
            } else {
                return res.status(200).send({ message: "Image deleted SuccessFUlly" })
            }

        });

    } catch (e) {
        console.log(e)
        return res.send(e.message)
    }
})

app.get('/imageUpload', async (req, res) => {

    let query = `select * from trn_image`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            var buffer = Buffer(results[0].img);
            var string = buffer.toString('base64')
            console.log(string)
            return res.json(results[0].img)

        }
    })
})

app.post('/staffcertification', async (req, res) => {

    const allowedFileFormats = /\.(png|PNG|jpeg|JPEG|jpg|JPG)$/
    try {
        const form = new formidable.IncomingForm()
        let { fields, files, err } = await new Promise(function (resolve, reject) {
            form.parse(req, async (err, fields, files) => {
                resolve({ fields: fields, files: files, err: err })
            })
        })

        if (!(files['CertificateImage'].originalFilename).match(allowedFileFormats)) {
            return res.status(400).json({ code: 400, message: "invalid file format" })
        }
        let imageData;
        if ((files['CertificateImage'].originalFilename).match(allowedFileFormats)) {
            imageData = fs.readFileSync(files['CertificateImage'].filepath)
            console.log(imageData)
        }
        let query = 'INSERT INTO Staff_Certificate values (?,?,?,?,?,?,?,?,?)';
        let parameters = ["", fields['StaffID'], fields['Certification'], fields['CertificationBody'], fields['ValidityStartDate'], fields['ValidityEndDate'], imageData, fields['AddedByUserID'], fields['AddedDateTime']]
        console.log(parameters)
        pool.query(query, parameters, function (err, result) {
            if (err) throw err
            if (result.affectedRows > 0) {

                return res.status(200).send({ message: "Image Uploaded SuccessFUlly" })
            } else {
                return res.status(200).send({ message: "Image deleted SuccessFUlly" })
            }

        });

    } catch (e) {
        console.log(e)
        return res.send(e.message)
    }
})

app.get('/staffcertification', async (req, res) => {
    let query = `select * from Staff_Certificate`
    pool.query(query, function (err, results) {
        if (err) throw err
        if (results.length > 0) {
            var buffer = Buffer(results[0].CertificateImage);
            var string = buffer.toString('base64')
            return res.json({ img: string })

        }
    })
})

app.listen(3001, function (req, res) {
    console.log("running")
})