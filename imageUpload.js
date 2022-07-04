

const multer = require('multer')
//const upload = multer({ dest: 'uploads/' })
const cors = require('cors')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(express.json())
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

app.use('/uploads', express.static('uploads'))


const mysql = require('mysql');

var databaseConnectionPool = require('./databaseConnection/databaseConnectionPool');
const pool =databaseConnectionPool;

pool.query(`SELECT 1 + 1 AS solution`, function (error, results, fields) {
    if (error) throw error;
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true)
    } else {
        cb(null, false)
    }
}

const upload = multer({ storage: storage, limits: { fileSize: 1024 * 1024 * 5 }, fileFilter: fileFilter })

app.post('/imagesupload', upload.single('image'), (req, res) => {

    let query = "INSERT INTO `imagesurl`(`imageurl`) VALUES (?)"
    pool.query(query, req.file.path, function (err, results) {

        if (err) throw err
        if (results.affectedRows > 0) {
            return res.status(200).json({ code: 200, message: "success" })
        } else {
            return res.status(401).json({ code: 401, "message": "unauthorized user" })
        }

    })
})

app.get('/imagesupload', async (req, res) => {

    pool.query(`select * from imagesurl`, function (err, results, fields) {
        if (err) throw err
        if (results.length > 0) {
            return res.status(200).json(results)
        } else {
            return res.status(401).json({ "code": 401, "message": results.imageurl })
        }
    })
})


const port = 3002
app.listen(3002, function (req, res) {
    console.log(`running${port}`)
})
