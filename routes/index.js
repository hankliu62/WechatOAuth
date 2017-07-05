var todos = require('./todos');
var wechat = require('./wechat');
var jsonp = require('./jsonp');
var agwebhook = require('./agwebhook');
var tools = require('./tools');
var qiniu = require('./qiniu');
var upload = require('./upload');
var files = require('./files');
var regions = require('./regions');

// 合并所有的module routers
var moduleRouters = {
  todos: todos,
  wechat: wechat,
  jsonp: jsonp,
  tools: tools,
  agwebhook: agwebhook,
  qiniu: qiniu,
  upload: upload,
  files: files,
  regions: regions,
};

module.exports = moduleRouters
