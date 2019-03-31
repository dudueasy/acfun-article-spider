/*
this module is used to create ids of resources,
feed & manipulate resource id for spider 
*/

const redis = require('./redis_connection_service');
const path = require('path');
require('dotenv').config({path: path.join(__dirname, "../.env")});

// the key of resource Ids set in redis
const ID_SET_TO_REDIS_KEY = process.env.ID_SET_TO_REDIS_KEY;

// the key of retrieved Ids set in redis
const RETRIEVED_ID_SET_TO_REDIS_KEY = process.env.RETRIEVED_ID_SET_TO_REDIS_KEY;
const FAILED_ID_SET_TO_REDIS_KEY = process.env.FAILED_ID_SET_TO_REDIS_KEY;


// this function is used to insert a range of resource ids into redis
// use redis set to prevent DUPLICATED ACF_ID  10W - 200W
// minId, maxId present X0000 ids
async function generateResourceIdToRedis(minId, maxId) {
  for (let id = minId; id < maxId; id++) {
    // create a array with 10000 as length
    const idArr = [];

    // insert 10000 ids into redis set each time
    for (let j = 0; j < 10000; j++) {
      idArr.push(id * 10000 + j);
    }

    let success = await redis.sadd(ID_SET_TO_REDIS_KEY, idArr);
  }
}

async function getRandomResourceIds(count) {
  return await redis.spop(ID_SET_TO_REDIS_KEY, count);
}

async function markArticleIdSucceed(id) {
  return await redis.sadd(RETRIEVED_ID_SET_TO_REDIS_KEY, id);
}

async function markArticleIdFailed(id) {
  return await redis.sadd(FAILED_ID_SET_TO_REDIS_KEY, id);
}

async function idBackToPool(id) {
  return await redis.sadd(ID_SET_TO_REDIS_KEY, id);
}

async function getRemainingIdCount() {
  return await Number(redis.scard(ID_SET_TO_REDIS_KEY));
}

module.exports = {
  generateResourceIdToRedis,
  getRandomResourceIds,
  markArticleIdSucceed,
  markArticleIdFailed,
  idBackToPool,
  getRemainingIdCount,
};