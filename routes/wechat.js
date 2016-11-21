var router = require('express').Router();
var crypto = require('crypto');
var request = require('request');
var AV = require('leanengine');
var log4js = require('log4js');

var wechatConfig = require('../config/wechat');
var WechatToken = require('../model/WechatToken');
var WechatTicket = require('../model/WechatTicket');
var WechatTokenName = require('../constants/constants').WECHAT_TOKEN_TABLE_NAME;
var WechatTicketName = require('../constants/constants').WECHAt_TICKET_TABLE_NAME;
// var WechatToken = AV.Object.extend(WechatTokenName);
var WechatUtil = require('../utils/WechatUtil');
router.get('/check_signature', function (req, res, next) {
  var signature = req.query.signature;
  var timestamp = req.query.timestamp;
  var nonce = req.query.nonce;
  var echostr = req.query.echostr;
  var token = wechatConfig.token;

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

var handWechatResponse = function (error, response, body) {
  const data = JSON.parse(body);
  if (error) {
    var logger = log4js.getLogger('Wechat');
    logger.error(error);
  }
  return { error: error, response: response, body: body, data: data };
};

var createToken = function (token) {
  token.create_at = new Date().toISOString();
  var wechatToken = new WechatToken();
  return wechatToken.create(token);
}
var getLastTokenFromDB = function () {
  var query = new AV.Query(WechatTokenName);
  query.descending('updatedAt');
  return new Promise(function (resolve, reject) {
    query.first().then(function (token) {
      var formatedToken = {objectId: token.id, createdAt: token.createdAt, updatedAt: token.updatedAt};
      if (token && token._hasData) {
        for (var key in token._serverData) {
          if (token._serverData.hasOwnProperty(key)) {
            formatedToken[key] = token._serverData[key];
          }
        }
        resolve(formatedToken);
      } else {
        reject();
      }
    }, function (error) {
      var logger = log4js.getLogger('LeanStorage');
      logger.error(error);
      reject();
    });
  });
};
var getTokenFromWechat = function () {
  var url = wechatConfig.api_domain + '/cgi-bin/token?grant_type=client_credential&appid=' +
    wechatConfig.appid + '&secret=' + wechatConfig.appsecret;
  return new Promise(function (resolve, reject) {
    request(url, function (error, response, body) {
      var result = handWechatResponse(error, response, body);
      resolve(result);
    });
  });
};

var getToken = function () {
  return new Promise(function (resolve, reject) {
    getLastTokenFromDB().then(function (token) {
      if (!token || !WechatUtil.isValid(token)) {
        getTokenFromWechat().then(function (result) {
          resolve(result);
        });
      } else {
        resolve({ error: null, response: null, data: token });
      }
    }, function () {
      getTokenFromWechat().then(function (result) {
        resolve(result);
      });
    });
  });
};

var getLastTicketFromDB = function (url) {
  var query = new AV.Query(WechatTicketName);
  query.equalTo('url', url);
  query.descending('updatedAt');
  return new Promise(function (resolve, reject) {
    query.first().then(function (ticket) {
      if (ticket && ticket._hasData) {
        var formatedTicket = {objectId: ticket.id, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt};
        for (var key in ticket._serverData) {
          if (ticket._serverData.hasOwnProperty(key)) {
            formatedTicket[key] = ticket._serverData[key];
          }
        }
        resolve(formatedTicket);
      } else {
        reject();
      }
    }, function (error) {
      var logger = log4js.getLogger('LeanStorage');
      logger.error(error);
      reject();
    });
  });
}
var getTicketFromWechat = function () {
  return new Promise(function (resolve, reject) {
    getToken().then(function (result) {
      if (result.response) {
        var data = result.data;
        if (data.errcode) {
          var logger = log4js.getLogger('Wechat');
          logger.error(data);
        }

        createToken(data);
      }

      var token = result.data;
      var access_token = token.access_token;
      var url = wechatConfig.api_domain + '/cgi-bin/ticket/getticket?access_token=' + access_token + '&type=jsapi';
      request(url, function (error, response, body) {
        var ticketResult = handWechatResponse(error, response, body);
        if (ticketResult.data) {
          ticketResult.data.access_token = access_token;
        }
        resolve(ticketResult);
      });
    });
  });
};

var getTicket = function (url, isdebug) {
  return new Promise(function (resolve, reject) {
    getLastTicketFromDB(url).then(function (ticket) {
      if (!ticket || !WechatUtil.isValid(ticket) || isdebug) {
        getTicketFromWechat().then(function (result) {
          resolve(result);
        });
      } else {
        resolve({ error: null, response: null, data: ticket });
      }
    }, function () {

      getTicketFromWechat().then(function (result) {
        resolve(result);
      });
    });
  });
}
router.use('/get_token', function (req, res, next) {
  // query last token from db, check the token is valid, if not, request from wechat api
  getToken().then(function (result) {
    var error = result.error;
    var response = result.response;
    var data = result.data;

    if (error) {
      res.status(response.statusCode).send(result);
      return;
    }

    if (response) {
      if (data.errcode) {
        var logger = log4js.getLogger('Wechat');
        logger.error(data);
        res.status(response.statusCode).send({ error: data, response: response,
          body: data });
      }

      createToken(data).then(function (token) {
        res.status(response.statusCode).send({ error: null, data: {
          token: token } });
      }).catch(next);
      return;
    }

    if (data) {
      res.status(200).send({ error: null, data: { token: data } });
    }
  });
});

router.get('/get_jssdk_signature', function (req, res, next){
  var url = req.query.url;
  getTicket(url).then(function (result) {
    var error = result.error;
    var response = result.response;
    var data = result.data;

    if (error) {
      res.status(response.statusCode).send(result);
      return;
    }

    if (response) {
      if (data.errcode) {
        var logger = log4js.getLogger('Wechat');
        logger.error(data);
        res.status(response.statusCode).send({ error: data, response: response,
          body: data });
      }

      var current = new Date();
      var ticketSrc = data.ticket;
      var noncestr = WechatUtil.createNonceStr();
      var timestamp = parseInt(current.getTime() / 1000, 10) + '';
      var signature = WechatUtil.createSignature(ticketSrc, noncestr, timestamp, url);
      var newTicket = {
        appid: wechatConfig.appid,
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
        res.status(response.statusCode).send({ error: null, data: {
          signature: ticket } });
      }).catch(next);
      return;
    }

    if (data) {
      res.status(200).send({ error: null, data: { signature: data } });
    }
  });
});

module.exports = router;