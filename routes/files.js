'use strict';
var router = require('express').Router();
var formidable = require('formidable');
var request = require('request');
var log4js = require('log4js');
var CONSTANTS = require('../constants/Constants');

var filesLogger = log4js.getLogger('Files');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;


//设置跨域访问
router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, If-Modified-Since");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

router.post('/upload', function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (error, fields, files) {
    var nameFragment = files.file.name.split('.');
    var length = nameFragment.length;
    var index = length > 1 ? length - 1 : length;
    nameFragment.splice(index, 0, `_${new Date().valueOf()}`);
    if (length > 1) {
      nameFragment.splice(length, 0, '.');
    }
    var tempName = nameFragment.join('');
    res.status(SUCCESS_CODE).json({id: tempName});
  });
});

router.get('/download', function (req, res, next) {
  var url = decodeURIComponent(req.query.url);
  var filename = req.query.filename;
  res.header('Content-Type', 'application/octet-stream');
  res.header('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.header('Content-Transfer-Encoding', 'binary');
  request.get(url).pipe(res);
});

module.exports = router;
