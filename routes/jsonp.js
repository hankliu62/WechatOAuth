var router = require('express').Router();
var request = require('request');

router.get('jsonp_proxy', function (req, params, next) {
  var method = req.query.method;
  var path = req.query.path;
  var params = req.query.params;
  var callback = req.query.callback;
});