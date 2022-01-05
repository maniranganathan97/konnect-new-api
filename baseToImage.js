const base = require('./base64.json')

const buffer = Buffer.from(base.demo, 'base64')
console.log(buffer)