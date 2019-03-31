// this module build mongoose db connection.
// call this module before using mongoose model api
const path = require('path');
const mongoose = require('mongoose');
let logger = require('../utils/loggers/logger');

require('dotenv').config({path: path.join(__dirname, '.env')});

mongoose.set('useFindAndModify', false);
mongoose.Promise = Promise;


DB_RESOURCE_DB = process.env.DB_RESOURCE_DB;
DB_URL = process.env.DB_URL;

const uri = `${DB_URL}/${DB_RESOURCE_DB}`;


mongoose.connect(uri, {useNewUrlParser: true});
let db = mongoose.connection;

db.on('open', () => {
  logger('info', 'info', `mongodb connection built through mongoose, connected database: ${process.env.DB_RESOURCE_DB}`);
});

db.on('error', (e) => {
  logger('error', 'Mongodb connection error: %s', e.message, {stack: e.stack});
  process.exit(1);
});

// mongoodb 连接测试代码 

module.exports = db;
