'use strict';
var router = require('express').Router();
var formidable = require('formidable');
var log4js = require('log4js');
var CONSTANTS = require('../constants/Constants');
var CrossSiteMiddleware = require('../middleware/cors');

var uploadLogger = log4js.getLogger('Upload');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;


//设置跨域访问
router.all('*', CrossSiteMiddleware());

router.post('/files', function (req, res, next) {
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

module.exports = router;
