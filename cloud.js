var AV = require('leanengine');
var log4js = require('log4js');

var CONSTANTS = require('./constants/Constants');

var leanStorageLogger = log4js.getLogger('LeanStorage');
var WechatTokenName = CONSTANTS.TableNames.WECHAT_TOKEN_TABLE_NAME;
var WechatTicketName = CONSTANTS.TableNames.WECHAt_TICKET_TABLE_NAME;
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;
var SERVER_ERROR_CODE = CONSTANTS.StatusCodes.SERVER_ERROR;

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!');
});

var handlerQueryResolve = function (type) {
  return function (results) {
    var removeItems = [];
    for (var item of results) {
      if (item && item.updatedAt && item.get('expires_in')) {
        var expires_in = parseInt(item.get('expires_in'), 10);
        var updatedAt = new Date(item.updatedAt).getTime();
        var currentAt = current.getTime();

        if (currentAt > (updatedAt + expires_in * 1000)) {
          removeItems.push(item);
        }
      } else {
        removeItems.push(item);
      }
    }

    if (removeItems.length) {
      // 批量删除
      var data = {};
      data[type] = removeItems;

      AV.Object.destroyAll(removeItems).then(function () {
        // 成功
        data.message = 'success';
        response.send({ error: null, statusCode: SUCCESS_CODE, data: data });
      }, function (error) {
        // 异常处理
        leanStorageLogger.error(error);
        data.message = 'fail';
        response.send({ error: error, statusCode: SERVER_ERROR_CODE, data: data });
      });
    } else {
      response.send({ error: null, statusCode: SUCCESS_CODE, data: { message: 'has not expired ' + type } });
    }
  }
}

var handlerQueryReject = function (type) {
  return function (error) {
    // 异常处理
    leanStorageLogger.error(error);
    response.send({ error: error, statusCode: SERVER_ERROR_CODE, data: { message: 'Clear expires wechat ' + type + ' fail!' } });
  }
}

AV.Cloud.define('clear_expires_token', function(request, response) {
  var current = new Date();
  var query = new AV.Query(WechatTokenName);
  query.ascending('updatedAt');
  var queryResolveHandler = handlerQueryResolve('token');
  var queryRejectHandler = handlerQueryReject('token')
  query.find().then(queryResolveHandler, queryRejectHandler);
});

AV.Cloud.define('clear_expires_signature', function(request, response) {
  var current = new Date();
  var query = new AV.Query(WechatTicketName);
  query.ascending('updatedAt');
  var queryResolveHandler = handlerQueryResolve('signature');
  var queryRejectHandler = handlerQueryReject('signature')
  query.find().then(queryResolveHandler, queryRejectHandler);
});

module.exports = AV.Cloud;
