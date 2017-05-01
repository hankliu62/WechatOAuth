'use strict';
var router = require('express').Router();
var formidable = require('formidable');
var request = require('request');
var log4js = require('log4js');
var CONSTANTS = require('../constants/Constants');
var CrossSiteMiddleware = require('../middleware/CrossSite');

var filesLogger = log4js.getLogger('Files');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;

//设置跨域访问
router.all('*', CrossSiteMiddleware());

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
  var filename = decodeURIComponent(req.query.filename);
  res.set({
    'Content-type': 'application/octet-stream',
    'Content-Disposition': 'attachment;filename=' + filename
  });

  request.get(url).on('data', function (chunk) {
    res.write(chunk, 'binary');
  }).on('end', function () {
    res.end();
  });
});

module.exports = router;
