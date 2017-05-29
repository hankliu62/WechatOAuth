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
var CrossSiteMiddleware = require('../middleware/cors');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;
var SERVER_ERROR_CODE = CONSTANTS.StatusCodes.SERVER_ERROR;
var INVALID_PARAMETER = CONSTANTS.StatusCodes.INVALID_PARAMETER;

//设置跨域访问
router.all('*', CrossSiteMiddleware());

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

var uploadFileToQiniu =  function (uptoken, key, temporaryFile) {
  return function (res) {
    var extra = new qiniu.io.PutExtra();
    qiniu.io.putFile(uptoken, key, temporaryFile, extra, function(qiniuError, ret) {
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
}

var writePageFileToQiniu = function (accessKey, bucketName, contentData) {
  return function (res) {
    var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.html';
    var temporaryFile = 'runtime/temporary/qrcode/' + key;
    fs.writeFile(temporaryFile, contentData, function (fileError, data) {
      if (fileError) {
        qiniuLogger.error(__file + ' L:' + __line + ' - ', fileError);
        res.status(SERVER_ERROR_CODE).send(
          { error: fileError, statusCode: SERVER_ERROR_CODE, response: data });
      } else {
        var uptoken = getQiniuFileUptoken(accessKey, bucketName, key);
        uploadFileToQiniu(uptoken, key, temporaryFile)(res)(res);
      }
    });
  }
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
  writePageFileToQiniu(accessKey, bucketName, createdFileContent)(res);
});

router.post('/upload-image-page', function (req, res, next) {
  var content = req.body.content;
  var image = req.body.image;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;

  var data = fs.readFileSync('runtime/template/qrcode/image.html', { encoding: 'utf-8'});
  var createdFileContent = data.replace('<%= content =%>', content).replace('<%= title =%>', '').replace(
    /<%= url =%>/g, image.url).replace('<%= key =%>', image.key);

  writePageFileToQiniu(accessKey, bucketName, createdFileContent)(res);
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
  writePageFileToQiniu(accessKey, bucketName, createdFileContent)(res);
});

router.post('/upload-vcard-page', function (req, res, next) {
  var vcard = req.body.vcard;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;
  var filetype = req.body.filetype;

  const readFileOptions = { encoding: 'utf-8'}

  var data = fs.readFileSync('runtime/template/qrcode/vcard/vcard.html', readFileOptions);
  var avatar = vcard.avatar || 'http://oiq00n80p.bkt.clouddn.com/image_hover_default_avatar.png'
  var vcardBasicTemplate = fs.readFileSync('runtime/template/qrcode/vcard/vcard-module-basic.html', readFileOptions);
  vcardBasicTemplate = vcardBasicTemplate.replace(/<%= headerLayout =%>/g, vcard.headerLayout).replace(/<%= avatar =%>/g, avatar).replace(
    /<%= cover =%>/g, vcard.cover.value).replace(/<%= name =%>/g, vcard.name.value).replace(/<%= appointment =%>/g, vcard.appointment.value).replace(
    /<%= company =%>/g, vcard.company.value)
  var createdFileContent = data.replace('<%= basic-module =%>', vcardBasicTemplate)
  var vcardModules = [
    {
      name: 'contact',
      keys: ['tel', 'phone', 'fax', 'email']
    },
    {
      name: 'account',
      keys: ['wechat', 'website', 'weibo', 'qq']
    },
    {
      name: 'address',
      keys: ['address']
    },
    {
      name: 'explanation',
      keys: ['explanation']
    },
  ]
  var contactKeys = ['tel', 'phone', 'fax', 'email']
  var existPropertiesValue = function (key) {
    if (key === 'address') {
      return vcard[key] && vcard[key].value &&
        (vcard[key].value.province || vcard[key].value.city || vcard[key].value.county || vcard[key].value.town)
    }

    return vcard[key] && vcard[key].value
  }

  for (var vcardModule of vcardModules) {
    var keys = vcardModule.keys
    var vcardModuleTemplate = ''
    if (keys.some(existPropertiesValue)) {
      var vcardPropertyTemplate = fs.readFileSync(`runtime/template/qrcode/vcard/vcard-property.html`, readFileOptions);
      vcardModuleTemplate = fs.readFileSync(`runtime/template/qrcode/vcard/vcard-module-${vcardModule.name}.html`, readFileOptions);
      var vcardPropertiesTemplate = ''
      if (vcardModule.name === 'address') {
        var address = [vcard.address.value.province, vcard.address.value.city, vcard.address.value.county, vcard.address.value.town].join(', ')
        for (var key of keys) {
          if (vcard[key] && vcard[key].value) {
            vcardPropertiesTemplate += vcardPropertyTemplate.replace(/<%= key =%>/g, key).replace(
              /<%= name =%>/g, vcard[key].text).replace(/<%= value =%>/g, address)
          }
        }
      } else {
        for (var key of keys) {
          if (vcard[key] && vcard[key].value) {
            vcardPropertiesTemplate += vcardPropertyTemplate.replace(/<%= key =%>/g, key).replace(
              /<%= name =%>/g, vcard[key].text).replace(/<%= value =%>/g, vcard[key].value)
          }
        }
      }
      vcardModuleTemplate = vcardModuleTemplate.replace(/<%= properties =%>/g, vcardPropertiesTemplate)
    }
    var createdFileContent = createdFileContent.replace(`<%= ${vcardModule.name}-module =%>`, vcardModuleTemplate)
  }

  writePageFileToQiniu(accessKey, bucketName, createdFileContent)(res);
});

router.post('/upload-wechat-page', function (req, res, next) {
  var url = req.body.url;
  var accessKey = req.body.accesskey;
  var bucketName = req.body.bucketname;

  var requestHandler = function (error, response, body) {
    if (body === '') {
      res.status(INVALID_PARAMETER).send(
        { error: null, statusCode: INVALID_PARAMETER, messages: '请输入正确的公众微信号' });
    } else {
      var key = ObjectUtil.generateObjectId(~~(new Date().valueOf() / 1000)) + '.jpg';
      var temporaryFile = 'runtime/temporary/images/' + key;
      var writeFileStream = fs.createWriteStream(temporaryFile);

      var writeFileHandler = function () {
        var uptoken = getQiniuFileUptoken(accessKey, bucketName, key);
        uploadFileToQiniu(uptoken, key, temporaryFile)(res);
      }
      writeFileStream.on('close', writeFileHandler);
      request.get(url).pipe(writeFileStream);
    }
  }

  request.get(url, requestHandler);
});

module.exports = router;
