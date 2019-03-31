var express = require('express');
var router = express.Router();

const path = require('path')
require('dotenv').config({path: path.join(__dirname, "../.env")});

// connect to mongodb through mongoose
require('../services/mongoose_db_connection')
const ArticleModel = require('../models/article')
let logger = require('../utils/loggers/logger')

const HOST = process.env.HOST
const PORT = process.env.PORT
const serverUrl = `${HOST}:${PORT}`

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Acfun Article Spider' });
});

// 爬虫微服务验证接口
router.get('/spiderProtocol', (req, res) => {
  res.json({
    code: 0,
    protocol: {
      version: '0.1',
      name: 'FULL_FLEDGED_NET_SPIDER_PROTOCOL',
    },
    config: {
      singleContent:{
        url:'not_created',
        frequency: 5,
      }, 
      contentList:{
        url: `${serverUrl}/content`,
        frequency: 5,
        pageSize: 10
      } 
    }
  })
})

// 提供爬虫保存到本地的资源数据, 接收 pageSize 和 lastestId 作为查询参数
router.get('/content', async (req, res) => {
  try {
    const { pageSize, latestId } = req.query
    // 创建一个 match 对象,
    // 如果查询参数中有 lastestId 字段, 那么它将作为查询的依据 
    // 需要记录上一次请求该接口时的, 数据条目中最大的 id 值 
    // 需要该接口返回的数据 _id 字段大于 lastedtId 的资源 
    // 由于mongodb 数据 id 是递增的, 这样可以保证该接口返回的资源是有序的,
    // 在 mongodb 数据库中的创建时间是递增的
    // 如果没有 lastedtId 字段, 那么使用的查询依据 match 为空

    // define match, projection, option for QUERY
    const match = {}
    if (latestId) match._id = {
      $gt: latestId,
    } 
    const projection = null 
    const option = { limit: Number(pageSize) || 10, sort: '_id' } 
    const articles = await ArticleModel.find(match, projection, option).catch(err=>{
      logger('request params error', '请求参数异常 : %s', err.message, err.stack);

      res.send({ code: 400, msg: '请求参数异常' });

    })

    contentList = []
    for (let model of articles) {
      let { _doc: article } = model

      contentList.push({
        resourceId:article.resourceId,
        title: article.title,
        contentType: 'dom',
        content: {
          html: article.articleContentHtml,
          text: article.content,
        },
        tags: article.tags,
        contentId: article._id,
        originalCreatedAt: article.originalCreatedAt
      })
    }

    res.json({ contentList })
  }
  catch (err) {
    logger('error', 'uncaughtException error in routes/index.js : %s', err.message, err.stack);
  }
})

module.exports = router;
