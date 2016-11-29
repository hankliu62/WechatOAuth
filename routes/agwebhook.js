'use strict';
var router = require('express').Router();

router.post('/check_webhook_signature', function (req, res, next) {
  var type = req.query.type;

  if (type === 'ping') {
    res.status(200).send('pong');
  }
});

module.exports = router;
