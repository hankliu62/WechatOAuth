'use strict';
var router = require('express').Router();

//设置跨域访问
router.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/x-www-form-urlencoded;charset=utf-8");
  next();
});

router.post('/check_webhook_signature', function (req, res, next) {
  var type = req.body.type;

  if (type === 'ping') {
    res.status(200).send('pong');
  }
});

module.exports = router;
