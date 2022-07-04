const router = require("express").Router();
const mysql = require('mysql');
const uuid = require('uuid');
const Multer = require('multer');
const path = require('path')
const fs = require('fs')
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
var configPath = './config.json';
var databaseConfig = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));

const pool = mysql.createPool({
  host: databaseConfig.databaseHostUrl,
  user: databaseConfig.databaseUsername,
  password: databaseConfig.databasePassword,
  database: databaseConfig.databaseName,
  multipleStatements: true,
  dateStrings: true
});

module.exports=pool;