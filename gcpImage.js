const { format } = require('util')
const express = require('express')
const Multer = require('multer')
const path = require('path')

const { Storage } = require('@google-cloud/storage')


const app = express();
app.set('view engine', 'pug');

app.use(express.json());

const multer = Multer({
    storage: Multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
    },
})

const gc = new Storage({
    keyFilename: path.join(__dirname, './keys.json'),
    projectId: 'nodejsapiengine'
})

// gc.getBuckets().then(x => console.log(x))

const bucket = gc.bucket('images-pest')


app.get('/', (req, res) => {
    res.render('form.pug');
});

// Process the file upload and upload to Google Cloud Storage.
app.post('/upload', multer.single('file'), (req, res, next) => {
    console.log(req.file)
    console.log(req.body.demo)
    if (!req.file) {
        res.status(400).send('No file uploaded.');
        return;
    }

    // Create a new blob in the bucket and upload the file data.
    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream();

    blobStream.on('error', err => {
        next(err);
    });

    blobStream.on('finish', () => {
        // The public URL can be used to directly access the file via HTTP.
        const publicUrl = format(
            `https://storage.googleapis.com/${bucket.name}/${blob.name}`
        );

        res.status(200).send(publicUrl);
    });

    blobStream.end(req.file.buffer);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
});