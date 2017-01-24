'use strict';
var router = require('express').Router();
var request = require('request');
var fs = require('fs');
var log4js = require('log4js');
var config = require('../config/qiniu');
var qiniu = require('qiniu');
var qiniuLogger = log4js.getLogger('Wechat');
var StringUtil = require('../utils/StringUtil');
var ObjectUtil = require('../utils/ObjectUtil');
var CONSTANTS = require('../constants/Constants');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;
var SERVER_ERROR_CODE = CONSTANTS.StatusCodes.SERVER_ERROR;
var INVALID_PARAMETER = CONSTANTS.StatusCodes.INVALID_PARAMETER;

//设置跨域访问
router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, If-Modified-Since");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

var getQiniuUptoken = function (accessKey, bucketName) {
  qiniu.conf.ACCESS_KEY = accessKey;
  qiniu.conf.SECRET_KEY = config.SecretKey;

  var putPolicy = new qiniu.rs.PutPolicy(bucketName);
  var uptoken = putPolicy.token();
  return uptoken;
}

var getQiniuFileUptoken = function (accessKey, bucketName, key) {
  qiniu.conf.ACCESS_KEY = accessKey;
  qiniu.conf.SECRET_KEY = config.SecretKey;

  var putPolicy = new qiniu.rs.PutPolicy(bucketName + ':' + key)
  var uptoken = putPolicy.token();
  return uptoken;
}

router.get('/uptoken', function (req, res, next) {
  var accessKey = req.query.accesskey;
  var bucketName = req.query.bucketname;
  var token = getQiniuUptoken(accessKey, bucketName);

  res.header("Cache-Control", "max-age=0, private, must-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", 0);
  if (token) {
    res.json({ uptoken: token });
  }
});

router.get('/get-download-url', function (req, res, next) {
  var accessKey = req.query.accesskey;
  //构建私有空间的链接
  var url = decodeURIComponent(req.query.url);

  qiniu.conf.ACCESS_KEY = accessKey;
  qiniu.conf.SECRET_KEY = config.SecretKey;
  var policy = new qiniu.rs.GetPolicy();

  //生成下载链接url
  var downloadUrl = policy.makeRequest(url);

  if (downloadUrl) {
    res.json({ downloadUrl: downloadUrl });
  }
});

router.post('/upload-base64-image', function (req, res, next) {
  var content = req.body.content;
  var uptoken = req.body.uptoken;
  if (!uptoken) {
    var accessKey = req.body.accesskey;
    var bucketName = req.body.bucketname;

    uptoken = getQiniuUptoken(accessKey, bucketName);
  }

  var authorization = 'UpToken ' + uptoken;
  var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.png';
  var options = {
    method: 'POST',
    url: config.UploadBase64Url + '/key/' + StringUtil.base64Encode(key),
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': authorization
    },
    body: content
  };
  var requestHandler = function (error, response, body) {
    if (error) {
      qiniuLogger.error(__file + ' L:' + __line + ' - ', error);
      res.status(SERVER_ERROR_CODE).send(
        { error: error, statusCode: SERVER_ERROR_CODE, response: response, body: body });
    } else {
      body = JSON.parse(body);
      var url = config.Domain + '/' + body.key;
      res.header("Cache-Control", "max-age=0, private, must-revalidate");
      res.header("Pragma", "no-cache");
      res.header("Expires", 0);
      if (url) {
        res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { url: url } });
      }
    }
  };
  request(options, requestHandler);
});

router.post('/upload-content-page', function (req, res, next) {
  var content = req.body.content;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;

  var data = fs.readFileSync('runtime/template/qrcode/text.html', { encoding: 'utf-8'});
  var createdFileContent = data.replace('<%= content =%>', content);
  var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.html';
  var temporaryFile = 'runtime/temporary/qrcode/' + key;
  fs.writeFile(temporaryFile, createdFileContent, function (fileError, data) {
    if (fileError) {
      qiniuLogger.error(__file + ' L:' + __line + ' - ', fileError);
      res.status(SERVER_ERROR_CODE).send(
        { error: fileError, statusCode: SERVER_ERROR_CODE, response: data });
    } else {
      var uptoken = getQiniuFileUptoken(accessKey, bucketName, key);

      function uploadFile(uptoken, key, localFile) {
        var extra = new qiniu.io.PutExtra();
          qiniu.io.putFile(uptoken, key, localFile, extra, function(qiniuError, ret) {
            if (qiniuError) {
              qiniuLogger.error(__file + ' L:' + __line + ' - ', qiniuError);
              res.status(SERVER_ERROR_CODE).send(
                { error: qiniuError, statusCode: SERVER_ERROR_CODE, response: ret });
            } else {
              // 上传成功， 处理返回值
              var url = config.Domain + '/' + ret.key;
              res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { url: url } });
              fs.unlink(temporaryFile);
            }
        });
      }

      uploadFile(uptoken, key, temporaryFile);
    }
  });
});

router.post('/upload-image-page', function (req, res, next) {
  var content = req.body.content;
  var image = req.body.image;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;

  var data = fs.readFileSync('runtime/template/qrcode/image.html', { encoding: 'utf-8'});
  var createdFileContent = data.replace('<%= content =%>', content).replace('<%= title =%>', '').replace(
    /<%= url =%>/g, image.url).replace('<%= key =%>', image.key);
  var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.html';
  var temporaryFile = 'runtime/temporary/qrcode/' + key;
  fs.writeFile(temporaryFile, createdFileContent, function (fileError, data) {
    if (fileError) {
      qiniuLogger.error(__file + ' L:' + __line + ' - ', fileError);
      res.status(SERVER_ERROR_CODE).send(
        { error: fileError, statusCode: SERVER_ERROR_CODE, response: data });
    } else {
      var uptoken = getQiniuFileUptoken(accessKey, bucketName, key);

      function uploadFile(uptoken, key, localFile) {
        var extra = new qiniu.io.PutExtra();
          qiniu.io.putFile(uptoken, key, localFile, extra, function(qiniuError, ret) {
            if (qiniuError) {
              qiniuLogger.error(__file + ' L:' + __line + ' - ', qiniuError);
              res.status(SERVER_ERROR_CODE).send(
                { error: qiniuError, statusCode: SERVER_ERROR_CODE, response: ret });
            } else {
              // 上传成功， 处理返回值
              var url = config.Domain + '/' + ret.key;
              res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { url: url } });
              fs.unlink(temporaryFile);
            }
        });
      }

      uploadFile(uptoken, key, temporaryFile);
    }
  });
});

router.post('/upload-file-page', function (req, res, next) {
  var content = req.body.content;
  var file = req.body.file;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;
  var filetype = req.body.filetype;

  var data = fs.readFileSync('runtime/template/qrcode/file.html', { encoding: 'utf-8'});
  var createdFileContent = data.replace('<%= content =%>', content).replace('<%= title =%>', '').replace(
    /<%= url =%>/g, file.url).replace(/<%= key =%>/g, file.key).replace('<%= filetype =%>', filetype);
  var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.html';
  var temporaryFile = 'runtime/temporary/qrcode/' + key;
  fs.writeFile(temporaryFile, createdFileContent, function (fileError, data) {
    if (fileError) {
      qiniuLogger.error(__file + ' L:' + __line + ' - ', fileError);
      res.status(SERVER_ERROR_CODE).send(
        { error: fileError, statusCode: SERVER_ERROR_CODE, response: data });
    } else {
      var uptoken = getQiniuFileUptoken(accessKey, bucketName, key);

      function uploadFile(uptoken, key, localFile) {
        var extra = new qiniu.io.PutExtra();
          qiniu.io.putFile(uptoken, key, localFile, extra, function(qiniuError, ret) {
            if (qiniuError) {
              qiniuLogger.error(__file + ' L:' + __line + ' - ', qiniuError);
              res.status(SERVER_ERROR_CODE).send(
                { error: qiniuError, statusCode: SERVER_ERROR_CODE, response: ret });
            } else {
              // 上传成功， 处理返回值
              var url = config.Domain + '/' + ret.key;
              res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { url: url } });
              fs.unlink(temporaryFile);
            }
        });
      }

      uploadFile(uptoken, key, temporaryFile);
    }
  });
});

router.post('/upload-wechat-page', function (req, res, next) {
  var url = req.body.url;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;

  var requestHandler = function (error, response, body) {
    if (body === '') {
      res.status(INVALID_PARAMETER).send(
        { error: null, statusCode: INVALID_PARAMETER, response: { wechatName: '请输入正确的公众微信号' } });
    } else {
      request.get(url).pipe(writeFileStream);
    }
  }

  var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.png';
  var temporaryFile = 'runtime/temporary/images/' + key;
  var writeFileStream = fs.createWriteStream(temporaryFile);

  var writeFileHandler = function () {
    var uptoken = getQiniuFileUptoken(accessKey, bucketName, key);

    function uploadFile(uptoken, key, localFile) {
      var extra = new qiniu.io.PutExtra();
        qiniu.io.putFile(uptoken, key, localFile, extra, function(qiniuError, ret) {
          if (qiniuError) {
            qiniuLogger.error(__file + ' L:' + __line + ' - ', qiniuError);
            res.status(SERVER_ERROR_CODE).send(
              { error: qiniuError, statusCode: SERVER_ERROR_CODE, response: ret });
          } else {
            // 上传成功， 处理返回值
            var url = config.Domain + '/' + ret.key;
            res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { url: url } });
            fs.unlink(temporaryFile);
          }
      });
    }

    uploadFile(uptoken, key, temporaryFile);
  }

  writeFileStream.on('close', writeFileHandler);

  request.get(url, requestHandler);
});

module.exports = router;
