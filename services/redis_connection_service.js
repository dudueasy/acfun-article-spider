/* 
this module return a redis client that 
connects redis-server 
*/

const Redis = require('ioredis');
const redisClient = new Redis(
  {
    host: '127.0.0.1',
    port: 6379
  } 
);

module.exports = redisClient
