'use strict';
var router = require('express').Router();
var request = require('request');
var log4js = require('log4js');
var fs = require('fs');
var CrossSiteMiddleware = require('../middleware/CrossSite');
var CONSTANTS = require('../constants/Constants');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;

var filesLogger = log4js.getLogger('Regions');

//设置跨域访问
router.all('*', CrossSiteMiddleware());

router.get('/getregions', function (req, res, next) {
  var data = fs.readFileSync('runtime/template/regions/china-regions.json', { encoding: 'utf-8'});
  res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: data });
});

module.exports = router;
