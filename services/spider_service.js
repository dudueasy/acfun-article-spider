/*
Functionality:
-- this module is used to get html data from resourceUrl,
-- return an array of text & img src from retrieved dom

Communication with databases:
-- this module interacts with redis_service module for database
   connection and  resource id changing
-- this module build mongodb connection through mongodb package and
   interact with local mongodb database
*/

const path = require('path');
require('dotenv').config({path: path.join(__dirname, ".env")});
const axios = require('axios');
const cheerio = require('cheerio');
const RedisService = require('../services/content_id_service');
const moment = require('moment');
const jieba = require('nodejieba');
const ArticleModel = require('../models/article');

const logger = require('../utils/loggers/logger');


class Tag {
  constructor(tagType, value, score) {
    this.name = tagType;
    this.value = value;
    this.score = score;
  }
}

// init mongodb connection options
const mongodbUrl = process.env.DB_URL;
const DBName = process.env.DB_RESOURCE_DB;
const collectionName = process.env.DB_COLLECTION;

// init spider config
const resourceUrlPrefix = process.env.RESOURCE_URL_PREFIX;
const spideringInterval = Number(process.env.INTERVAL);
const CONTENT_SELECTOR = process.env.CONTENT_SELECTOR;

// a function to begin spider, this function does following task:
// 1. get multiple random resource ids from redis source_id_set
// 2. retrieve html data for each id
async function spideringArticles(count) {
  const ids = await RedisService.getRandomResourceIds(count);
  let succeedCount = 0;
  let errCount = 0;

  for (let id of ids) {
    let currentArticleData = await getSingleArticle(id)
      .then(r => {
        succeedCount += 1;
        console.log('Success! Article data fetched!!');
      })
      .catch(e => {
        errCount += 1;
        e.errCount = errCount;
        console.log(e.message);
      });

    // do something with fetched html data

    // set an interval of 1second (equivalent to time.sleep)
    // console.log('start waiting 1 second');
    await new Promise(resolve => {
      setTimeout(resolve, spideringInterval);
    });
    // console.log('end waiting 1 second');
  }
  return {succeedCount, errCount};
}

// fetch data from resource Url and store it into mongodb database
async function getSingleArticle(articleId) {

  // let resourceUrl ='http://localhost:/a/ac4714604'
  let resourceUrl = `${resourceUrlPrefix}${articleId}`;
  console.log('target url:', resourceUrl);

  const HTMLData = await axios(resourceUrl)
    .catch(e => {
      if (e.response) {
        // console.log('get respond with ', e.response.status);

        if (e.response.status === 404) {
          const error = new Error('Not Found');
          error.errorCode = 4040000;
          RedisService.markArticleIdFailed(articleId);
          throw error;
        } else if (e.response.status >= 500) {

          const error = new Error('Internal Server Error');
          error.errorCode = 5000000;
          RedisService.markArticleIdFailed(articleId);
          throw error;
        } else {
          RedisService.markArticleIdFailed(articleId);
          throw e;
        }
      } else if (e.request) {
        RedisService.markArticleIdFailed(articleId);
        throw new Error("no response was received");
      }
    });

  const $ = cheerio.load(HTMLData.data);

  // init a tags for resource related tags
  // including category and user defined tags
  let tags = [];


  let articleContent = $(`${CONTENT_SELECTOR}`)[0];
  let title = $('title').text();

  console.log("title: ", title);

  if (title.indexOf('出错啦') > -1) {
    RedisService.markArticleIdFailed(articleId);
    throw new Error("该连接指向一个错误页面");
  }

  // get divided tags from article title
  let titleTags = jieba.extract(title, 5);

  for (let tag of titleTags) {
    tags.push(new Tag('ARTICLE_TAG_TITLE', tag.word.trim(), tag.weight));
  }

  // 归一化文章资源的标题标签分值

  //retrieve article category from HTML data
  let articleTags = $('.article-parent').text().split('>');
  // console.log('articleTags', articleTags);

  articleTags.forEach(tag => {
    tags.push(new Tag('ARTICLE_CATEGORY', tag.trim(), 0.7));
  });

  //retrieve user defined tags from HTML data
  let userDefinedTags = [];
  let userTagsResponse = await axios(`${process.env.USER_DEFINED_TAGS_API}?contentId=${articleId}`);
  userTagsResponse.data.data.tagList.forEach(({tagName}) => {
    userDefinedTags.push(tagName);
  });

  // 用户自定义的文章标签
  userDefinedTags.forEach(tag => {
    tags.push(new Tag('ARTICLE_TAG_USER', tag.trim(), 0.5));
  });


  let originalCreatedAt = $('.up-time').text();

  // if .aiticleContent not exist  (url doesn't link to an article)
  if (!nodeHasContent($(articleContent))) {
    // if url link to video, do something
    const videoPlayer = $('#player');

    if (nodeHasContent(videoPlayer)) {
      console.log('this is a video resource');
    }

    RedisService.markArticleIdFailed(articleId);
    throw new Error('target url does not link to a article resource');
  } else {
    /*  successfully get resource data
    *   store two data into database: one with original Node object
    *     another one only with text and img.src
    * */

    let HTMLTextAndImg = getTextOrImg($, articleContent, []);
    let articleContentHTML = $(articleContent).toString();

    // insert original article content HTML & HTML text and imgs into mongodb collection

    const insertedModel = await ArticleModel.findOneAndUpdate(
      {resourceId: articleId},
      {
        $set: {
          resourceId: articleId,
          content: HTMLTextAndImg,
          articleContentHtml: articleContentHTML,
          createdAt: new Date(Date.now()),
          originalCreatedAt,
          title: title,
          tags: tags,
        },
      },
      {
        upsert: true,
        new: true,
      },
    );

    let insertedData = insertedModel._doc;
    console.log("insertedData: ", insertedData);

    console.log("insertedData:  ", insertedData._id);
    // _id = insertedData.value._id

    await RedisService.markArticleIdSucceed(articleId);
    return insertedData;
  }
}

function nodeHasContent(cheerioNode) {
  if (cheerioNode.length) {
    return cheerioNode.html().trim();
  } else {
    return false;
  }
}

// Insert text and img src from received DOM to received container
function getTextOrImg($, Dom, container) {
  let cheerioDom = $(Dom);
  // get children element
  const children = cheerioDom.children();
  if (children.length === 0) {
    if (cheerioDom.text()) {
      container.push(cheerioDom.text());
    } else if (cheerioDom[0].name === 'img') {
      container.push(cheerioDom[0].attribs.src);
    }
  } else {
    children.map((index, child) => {
      getTextOrImg($, child, container);
    });
  }
  return container;
}

module.exports = {
  spideringArticles,
  getSingleArticle,
};
