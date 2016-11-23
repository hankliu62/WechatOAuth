var router = require('express').Router();
var request = require('request');

router.get('/jsonp_proxy', function (req, res, next) {
  var domin = req.protocol + '://' + req.header('host');
  var method = req.query.method;
  var path = decodeURIComponent(req.query.path);
  var params = req.query.params;
  if (params) {
    params = JSON.parse(decodeURIComponent(params))
  }
  var callback = req.query.callback;

  var fn = request[method];
  var url = domin + path;

  fn(url, function (error, response, body) {

    if (callback && typeof callback === 'string') {
      result = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
      res.send(result);
    } else {
      res.jsonp(JSON.parse(body))
    }
  });
});

module.exports = router;