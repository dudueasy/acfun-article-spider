# 项目说明
这是一个用于获取 acfun 文章的爬虫微服务项目, 同时提供了http服务和爬虫服务 
 
# 项目配置
通过 dotenv 模块和 .env 文件来配置项目, 所有可配置项目请参考 .env.default

# 服务依赖
* mongodb 服务器
* redis 服务器

# 项目入口
### http 服务
~~~
node bin/www
~~~ 
### 爬虫服务 
~~~
node scripts/spider.js command [parameters]
~~~
##### command: 
~~~
// 生成资源 id
generate_ids startNumber endNumber

// 批量爬取资源
start_getting_articles totalCount

// 获取单条资据
get_single_article resourceId 
~~~

##### 示例
~~~
// 生成 0 - 100W 区间的 id
node scripts/spider.js generate_ids 0 100

// 获取 1000 条文章资源
node scripts/spider.js start_getting_articles 1000

// 获取 id 为 2 的文章资源
node scripts/spider.js get_single_article 2
~~~

# 接口
### 验证爬虫服务
get '/spiderProtocol'

##### 作用: 获取该爬虫微服务的相关信息, 用于验证其可用性

### 访问爬虫服务
get '/content'
##### 作用: 返回该爬虫项目获取到的资源, 默认一次获取10条
##### 查询参数: 
pageSize: 数字, 定义每次获取的资源条数\
latestId: 资源 id, 表示最后一次访问该接口获取到的最后一个资源 id, 用于保存上次获取资源在数据库中的位置 
