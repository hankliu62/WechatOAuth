var router = require('express').Router();
var crypto = require('crypto');
var request = require('request');
var AV = require('leanengine');
var log4js = require('log4js');

var leanStorageLogger = log4js.getLogger('LeanStorage');
var wechatLogger = log4js.getLogger('Wechat');
var apiLogger = log4js.getLogger('Api');
var wechatConfig = require('../config/wechat');
var WechatToken = require('../model/WechatToken');
var WechatTicket = require('../model/WechatTicket');
var CONSTANTS = require('../constants/Constants');
var WechatTokenName = CONSTANTS.TableNames.WECHAT_TOKEN_TABLE_NAME;
var WechatTicketName = CONSTANTS.TableNames.WECHAt_TICKET_TABLE_NAME;
var WechatConfigName = CONSTANTS.TableNames.WECHAT_CONFIG_TABLE_NAME;
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;
var SERVER_ERROR_CODE = CONSTANTS.StatusCodes.SERVER_ERROR;
var NOT_FOUND_CODE = CONSTANTS.StatusCodes.NOT_FOUND;
var BAD_REQUEST = CONSTANTS.StatusCodes.BAD_REQUEST;
// var WechatToken = AV.Object.extend(WechatTokenName);
var WechatUtil = require('../utils/WechatUtil');
require('../common/global')

//设置跨域访问
router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

router.get('/check_signature', function (req, res, next) {
  var signature = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var echostr = req.query.echostr;
  var token = req.query.token;

  /*  加密/校验流程如下： */
  //1. 将token、timestamp、nonce三个参数进行字典序排序
  var array = [token, timestamp, nonce].sort();
  var str = array.join('');

  //2. 将三个参数字符串拼接成一个字符串进行sha1加密
  var sha1Code = crypto.createHash("sha1");
  var code = sha1Code.update(str,'utf-8').digest("hex");

  //3. 开发者获得加密后的字符串可与signature对比，标识该请求来源于微信
  if (code === signature) {
    res.send(echostr)
  } else {
    res.send({ error: 'error' });
  }
});

var createToken = function (token) {
  token.create_at = new Date().toISOString();
  var wechatToken = new WechatToken();
  return wechatToken.create(token);
}

var fetchWechatConfig = function (appid) {
  var query = new AV.Query(WechatConfigName);
  query.equalTo('appid', appid);
  return new Promise(function (resolve, reject) {
    var querySuccessHandler = function (config) {
      if (config && config._hasData) {
        var wechatConfig = {objectId: config.id, createdAt: config.createdAt, updatedAt: config.updatedAt};
        for (var key in config._serverData) {
          if (config._serverData.hasOwnProperty(key)) {
            wechatConfig[key] = config._serverData[key];
          }
        }
        resolve(wechatConfig);
      } else {
        const body = { appid: appid, errorMessage: 'Not Found' };
        reject({ error: new Error('Not Fount'), statusCode: NOT_FOUND_CODE, response: null, body: body, data: body });
      }
    }

    var queryFailHandler = function (error) {
      leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
      const body = { appid: appid };
      reject({ error: error, statusCode: SERVER_ERROR_CODE, response: null, body: body, data: body });
    }

    query.first().then(querySuccessHandler, queryFailHandler);
  });
}

var getLastTokenFromDB = function () {
  var query = new AV.Query(WechatTokenName);
  query.descending('updatedAt');
  return new Promise(function (resolve, reject) {
    var querySuccessHandler = function (token) {
      if (token && token._hasData) {
        var formatedToken = {objectId: token.id, createdAt: token.createdAt, updatedAt: token.updatedAt};
        for (var key in token._serverData) {
          if (token._serverData.hasOwnProperty(key)) {
            formatedToken[key] = token._serverData[key];
          }
        }
        resolve(formatedToken);
      } else {
        const body = { errorMessage: 'Not Found' };
        reject({ error: new Error('Not Fount'), statusCode: NOT_FOUND_CODE, response: null, body: body, data: body });
      }
    }

    var queryFailHandler = function (error) {
      leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
      const body = {};
      reject({ error: error, statusCode: SERVER_ERROR_CODE, response: null, body: body, data: body });
    }

    query.first().then(querySuccessHandler, queryFailHandler);
  });
};

var getTokenFromWechat = function (config) {
  return new Promise(function (resolve, reject) {
    var url = wechatConfig.api_domain + '/cgi-bin/token?grant_type=client_credential&appid=' +
      config.appid + '&secret=' + config.appsecret;
    var requestHandler = function (error, response, body) {
      const data = JSON.parse(body);
      if (error) {
        wechatLogger.error(__file + ' L:' + __line + ' - ', error);
        reject({ error: error, statusCode: SERVER_ERROR_CODE, response: response, body: body, data: data})
      } else {
        resolve({ error: null, statusCode: SUCCESS_CODE, response: response, body: body, data: data });
      }
    }

    request(url, requestHandler);
  });
};

var getToken = function (config) {
  return new Promise(function (resolve, reject) {
    var getTokenFromWechatSuccessHandler = function (result) {
      resolve(result);
    }

    var getTokenFromWechatFailHandler = function (data) {
      reject(data);
    }

    var getLastTokenFromDBSuccessHandler = function (token) {
      if (!token || !WechatUtil.isValid(token)) {
        getTokenFromWechat(config).then(getTokenFromWechatSuccessHandler, getTokenFromWechatFailHandler);
      } else {
        resolve({ error: null, statusCode: SUCCESS_CODE, response: null, data: token });
      }
    }

    var getLastTokenFromDBFailHandler = function (data) {
      getTokenFromWechat(config).then(getTokenFromWechatSuccessHandler, getTokenFromWechatFailHandler);
    }

    getLastTokenFromDB().then(getLastTokenFromDBSuccessHandler, getLastTokenFromDBFailHandler);
  });
};

var getLastTicketFromDB = function (url) {
  var query = new AV.Query(WechatTicketName);
  query.equalTo('url', url);
  query.descending('updatedAt');
  return new Promise(function (resolve, reject) {
    var querySuccessHandler = function (ticket) {
      if (ticket && ticket._hasData) {
        var formatedTicket = {objectId: ticket.id, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt};
        for (var key in ticket._serverData) {
          if (ticket._serverData.hasOwnProperty(key)) {
            formatedTicket[key] = ticket._serverData[key];
          }
        }
        resolve(formatedTicket);
      } else {
        const body = { 'url': url, errorMessage: 'Not Found' };
        reject({ error: new Error('Not Fount'), statusCode: NOT_FOUND_CODE, response: null, body: body, data: body });
      }
    }

    var queryFailHandler = function (error) {
      leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
      const body = { 'url': url };
      reject({ error: error, statusCode: SERVER_ERROR_CODE, response: null, body: body, data: body });
    }

    query.first().then(querySuccessHandler, queryFailHandler);
  });
}

var getTicketFromWechat = function (config) {
  return new Promise(function (resolve, reject) {
    var getTokenSuccessHandler = function (result) {
      var token = result.data;
      createToken(token);
      var access_token = token.access_token;
      var url = wechatConfig.api_domain + '/cgi-bin/ticket/getticket?access_token=' + access_token + '&type=jsapi';
      var requestHandler = function (error, response, body) {
        const data = JSON.parse(body);
        if (error) {
          wechatLogger.error(__file + ' L:' + __line + ' - ', error);
          reject({ error: error, statusCode: SERVER_ERROR_CODE, response: response, body: body, data: data});
        } else {
          data.access_token = access_token;
          resolve({ error: null, statusCode: SUCCESS_CODE, response: response, body: body, data: data });
        }
      }

      request(url, requestHandler);
    }

    var getTokenFailHandler = function (data) {
      reject(data);
    }

    getToken(config).then(getTokenSuccessHandler, getTokenFailHandler);
  });
};

var getTicket = function (url, config, isdebug) {
  return new Promise(function (resolve, reject) {
    var getTicketFromWechatSuccessHandler = function (result) {
      resolve(result);
    }

    var getTicketFromWechatFailHandler = function (data) {
      reject(data);
    }

    var getLastTicketFromDBSuccessHandler = function (ticket) {
      if (!ticket || !WechatUtil.isValid(ticket) || isdebug) {
        getTicketFromWechat(config).then(getTicketFromWechatSuccessHandler, getTicketFromWechatFailHandler);
      } else {
        resolve({ error: null, statusCode: SUCCESS_CODE, response: null, data: ticket });
      }
    }

    var getLastTicketFromDBFailHandler = function (data) {
      getTicketFromWechat(config).then(getTicketFromWechatSuccessHandler, getTicketFromWechatFailHandler);
    }

    getLastTicketFromDB(url).then(getLastTicketFromDBSuccessHandler, getLastTicketFromDBFailHandler);
  });
}

router.use('/get_token', function (req, res, next) {
  var appid = req.query.appid;

  if (!appid) {
    var data = {error: 'appid 不能为空', statusCode: BAD_REQUEST, errors: [], ids: []};
    apiLogger.error(__file + ' L:' + __line + ' - ', data)
    res.status(BAD_REQUEST).send(data);
  }

  var fetchWechatConfigSuccessHandler = function (config) {
    var getTokenSuccessHandler = function (result) {
      var error = result.error;
      var response = result.response;
      var data = result.data;
      var statusCode = response.statusCode;

      if (error) {
        res.status(statusCode).send(result);
        return;
      }

      if (response) {
        if (data.errcode) {
          wechatLogger.error(__file + ' L:' + __line + ' - ', data);
          res.status(SERVER_ERROR_CODE).send({ error: data, statusCode: SERVER_ERROR_CODE, response: response,
            body: data });
        }

        createToken(data).then(function (token) {
          res.status(SUCCESS_CODE).send({ error: null, statusCode: SUCCESS_CODE, data: { token: token } });
        }).catch(next);
        return;
      }

      if (data) {
        res.status(SUCCESS_CODE).send({ error: null, statusCode: SUCCESS_CODE, data: { token: data } });
      }
    }

    var getTokenFailHandler = function (data) {
      res.status(data.statusCode).send(data);
    }

    // query last token from db, check the token is valid, if not, request from wechat api
    getToken(config).then(getTokenSuccessHandler, getTokenFailHandler);
  }

  var fetchWechatConfigFailHandler = function (data) {
    res.status(data.statusCode).send(data);
  }

  fetchWechatConfig(appid).then(fetchWechatConfigSuccessHandler, fetchWechatConfigFailHandler);
});

router.get('/get_jssdk_signature', function (req, res, next){
  var url = req.query.url;
  var appid = req.query.appid;

  if (!url) {
    var data = {error: 'url 不能为空', statusCode: BAD_REQUEST, errors: [], ids: []};
    apiLogger.error(__file + ' L:' + __line + ' - ', data);
    res.status(BAD_REQUEST).send(data);
    return;
  }

  if (!appid) {
    var data = {error: 'appid 不能为空', statusCode: BAD_REQUEST, errors: [], ids: []};
    apiLogger.error(__file + ' L:' + __line + ' - ', data)
    res.status(BAD_REQUEST).send(data);
    return;
  }

  var fetchWechatConfigSuccessHandler = function (config) {
    getTicket(url, config).then(function (result) {
      var error = result.error;
      var response = result.response;
      var data = result.data;
      var statusCode = result.statusCode;

      if (error) {
        res.status(statusCode).send(result);
        return;
      }

      if (response) {
        if (data.errcode) {
          wechatLogger.error(__file + ' L:' + __line + ' - ', data);
          res.status(SERVER_ERROR_CODE).send({ error: data, statusCode: SERVER_ERROR_CODE, response: response, body: data });
        }

        var current = new Date();
        var ticketSrc = data.ticket;
        var noncestr = WechatUtil.createNonceStr();
        var timestamp = parseInt(current.getTime() / 1000, 10) + '';
        var signature = WechatUtil.createSignature(ticketSrc, noncestr, timestamp, url);
        var newTicket = {
          appid: config.appid,
          ticket: ticketSrc,
          noncestr: noncestr,
          timestamp: timestamp,
          url: url,
          expires_in: data.expires_in,
          signature: signature,
          access_token: data.access_token,
          create_at: current.toISOString()
        };
        var wechatTicket = new WechatTicket();

        wechatTicket.create(newTicket).then(function (ticket) {

          res.status(SUCCESS_CODE).send({ error: null, statusCode: SUCCESS_CODE, data: { signature: {
            appid: ticket.get('appid'),
            signature: ticket.get('signature'),
            noncestr: ticket.get('noncestr'),
            timestamp: ticket.get('timestamp')
          } } });
        }).catch(next);
        return;
      }

      if (data) {
        res.status(SUCCESS_CODE).send({ error: null, statusCode: SUCCESS_CODE, data: { signature: {
          appid: typeof data.get === 'function' ? ticket.get('appid') : data.appid,
          signature: typeof data.get === 'function' ? data.get('signature') : data.signature,
          noncestr: typeof data.get === 'function' ? data.get('noncestr') : data.noncestr,
          timestamp: typeof data.get === 'function' ? data.get('timestamp') : data.timestamp
        } } });
      }
    });
  }

  var fetchWechatConfigFailHandler = function (data) {
    res.status(data.statusCode).send(data);
  }

  fetchWechatConfig(appid).then(fetchWechatConfigSuccessHandler, fetchWechatConfigFailHandler);
});

router.delete('/clear_expires_signature', function(request, response, next) {
  var current = new Date();
  var query = new AV.Query(WechatTicketName);
  query.ascending('updatedAt');
  query.find().then(function(results) {
    var removeSignatures = [];
    for (var signature of results) {
      if (signature && signature.updatedAt && (signature.expires_in || signature._serverData.expires_in)) {
        var updatedAt = new Date(signature.updatedAt).getTime();
        var currentAt = current.getTime();
        var expires_in = parseInt(signature.expires_in || signature._serverData.expires_in, 10);

        if (currentAt > (updatedAt + expires_in * 1000)) {
          removeSignatures.push(signature);
        }
      } else {
        removeSignatures.push(signature);
      }
    }

    if (removeSignatures.length) {
      // 批量删除
      AV.Object.destroyAll(removeSignatures).then(function () {
        // 成功
        response.send({ error: null, statusCode: SUCCESS_CODE, data: { message: 'Clear expires wechat signature success!' } });
      }, function (error) {
        // 异常处理
        leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
        response.send({ error: error, statusCode: SERVER_ERROR_CODE, data: { signatures: removeSignatures } });
      }).catch(next);
    } else {
      response.send({ error: null, statusCode: SUCCESS_CODE, data: { message: 'Clear expires wechat signature success!' } });
    }
  }, function (error) {
    // 异常处理
    leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
    response.send({ error: error, statusCode: SERVER_ERROR_CODE, data: { message: 'Clear expires wechat signature fail!' } });
  }).catch(next);;
});

router.delete('/clear_access_token', function(request, response, next) {
  var current = new Date();
  var query = new AV.Query(WechatTokenName);
  query.ascending('updatedAt');
  query.find().then(function(results) {
    var removeItems = [];
    for (var item of results) {
      if (item && item.updatedAt && (item.get('expires_in') || item._serverData.expires_in)) {
        var updatedAt = new Date(item.updatedAt).getTime();
        var currentAt = current.getTime();
        var expires_in = parseInt(item.get('expires_in') || item._serverData.expires_in, 10);

        if (currentAt > (updatedAt + expires_in * 1000)) {
          removeItems.push(item);
        }
      } else {
        removeItems.push(item);
      }
    }

    if (removeItems.length) {
      // 批量删除
      AV.Object.destroyAll(removeItems).then(function () {
        // 成功
        response.send({ error: null, statusCode: SUCCESS_CODE, data: { message: 'Clear expires wechat token success!' } });
      }, function (error) {
        // 异常处理
        leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
        response.send({ error: error, statusCode: SERVER_ERROR_CODE, data: { tokens: removeItems } });
      }).catch(next);
    } else {
      response.send({ error: null, statusCode: SUCCESS_CODE, data: { message: 'Clear expires wechat tokens success!' } });
    }
  }, function (error) {
    // 异常处理
    leanStorageLogger.error(__file + ' L:' + __line + ' - ', error);
    response.send({ error: error, statusCode: SERVER_ERROR_CODE, data: { message: 'Clear expires wechat tokens fail!' } });
  }).catch(next);;
});

module.exports = router;
