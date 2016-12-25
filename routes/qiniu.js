'use strict';
var router = require('express').Router();
var config = require('../config/qiniu');
var qiniu = require('qiniu');

//设置跨域访问
router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

router.get('/uptoken', function (req, res, next) {
  var accessKey = req.query.accesskey;
  var bucketName = req.query.bucketname;
  qiniu.conf.ACCESS_KEY = accessKey;
  qiniu.conf.SECRET_KEY = config.SecretKey;

  var uptoken = new qiniu.rs.PutPolicy(bucketName);
  var token = uptoken.token();

  res.header("Cache-Control", "max-age=0, private, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", 0);
    if (token) {
        res.json({
            uptoken: token
        });
    }
});

module.exports = router;
