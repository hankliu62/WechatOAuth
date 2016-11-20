var AV = require('leanengine');
var log4js = require('log4js');

var WechatTokenName = require('./constants/constants').WECHAT_TOKEN_TABLE_NAME;
var WechatTicketName = require('./constants/constants').WECHAt_TICKET_TABLE_NAME;

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
  response.success('Hello world!');
});

AV.Cloud.define('clear_expires_token', function(request, response) {
  var current = new Date();
  var query = new AV.Query(WechatTokenName);
  query.ascending('updatedAt');
  query.lessThan('updatedAt', current.toISOString());
  query.find().then(function(results) {
    var removeTokens = [];
    for (var token of results) {
      if (token && (token.expires_in || token._serverData.expires_in)) {
        var updatedAt = new Date(token.updatedAt).getTime();
        var currentAt = current.getTime();
        var expires_in = parseInt(token.expires_in || token._serverData.expires_in, 10);

        if (currentAt > (createAt + expires_in * 1000)) {
          removeTokens.push(token);
        }
      } else {
        removeTokens.push(token);
      }
    }
    // 批量删除
    AV.Object.destroyAll(removeTokens).then(function () {
      // 成功
      esponse.success('Clear expires wechat token success!');
    }, function (error) {
      // 异常处理
      var logger = log4js.getLogger('LeanStorage');
      logger.error(error);
      response.success('Clear expires wechat token fail!');
    });
  });
});

AV.Cloud.define('clear_expires_signature', function(request, response) {
  var current = new Date();
  var query = new AV.Query(WechatTicketName);
  query.ascending('updatedAt');
  query.lessThan('updatedAt', current.toISOString());
  query.find().then(function(results) {
    var removeSignatures = [];
    for (var signature of results) {
      if (signature && (signature.expires_in || signature._serverData.expires_in)) {
        var updatedAt = new Date(signature.updatedAt).getTime();
        var currentAt = current.getTime();
        var expires_in = parseInt(signature.expires_in || signature._serverData.expires_in, 10);

        if (currentAt > (createAt + expires_in * 1000)) {
          removeSignatures.push(signature);
        }
      } else {
        removeSignatures.push(signature);
      }
    }
    // 批量删除
    AV.Object.destroyAll(removeSignatures).then(function () {
      // 成功
      esponse.success('Clear expires wechat signature success!');
    }, function (error) {
      // 异常处理
      var logger = log4js.getLogger('LeanStorage');
      logger.error(error);
      response.success('Clear expires wechat signature fail!');
    });
  });
});

module.exports = AV.Cloud;
