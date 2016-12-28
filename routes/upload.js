'use strict';
var router = require('express').Router();
var formidable = require('formidable');

//设置跨域访问
router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, If-Modified-Since");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

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
    res.status(200).json({id: tempName});
  });
});

module.exports = router;
