'use strict';
var router = require('express').Router();
var CrossSiteMiddleware = require('../middleware/CrossSite');

//设置跨域访问
router.all('*', CrossSiteMiddleware());

router.post('/check_webhook_signature', function (req, res, next) {
  var type = req.body.type;

  if (type === 'ping') {
    res.status(200).send('pong');
  }
});

module.exports = router;
