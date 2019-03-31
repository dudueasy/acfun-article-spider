// this module returns a mongoose Model for acfun articles storage
const mongoose = require('mongoose');
const {Schema} = mongoose;

const path = require('path');
require('dotenv').config({path: path.join(__dirname, "../.env")});

const DB_COLLECTION = process.env.DB_COLLECTION;

// build mongoose connection
require("../services/mongoose_db_connection");

const ArticleSchema = new Schema({
  resourceId: String,
  content: Schema.Types.Mixed,
  articleContentHtml: String,
  createdAt: {type: String, default: Date.now().valueOf()},
  originalCreatedAt: String,
  title: {type: String, required: true},
  tags: [{name: String, value: String, score: Number}],
});

const articleModel = mongoose.model(DB_COLLECTION, ArticleSchema);
module.exports = articleModel;
