'use strict';
var router = require('express').Router();
var ObjectID = require('bson-objectid');
var request = require('request');
var log4js = require('log4js');
var HexConverter = require('../model/HexConverter');
var CONSTANTS = require('../constants/Constants');
var CrossSiteMiddleware = require('../middleware/cors');

var toolsLogger = log4js.getLogger('Tools');
var SUCCESS_CODE = CONSTANTS.StatusCodes.SUCCESS;
var BAD_REQUEST = CONSTANTS.StatusCodes.BAD_REQUEST;
var INVALID_PARAMETER = CONSTANTS.StatusCodes.INVALID_PARAMETER;
var PARAM_TYPES = CONSTANTS.ToolsModule.GENERATOR_PARAM_TYPES;
var HEX_CONVERT_STRING_TYPES = CONSTANTS.ToolsModule.HEX_CONVERT_STRING_TYPES;

//设置跨域访问
router.all('*', CrossSiteMiddleware());

function generateObjectId (param) {
  if (param) {
    return ObjectID(param).toString()
  }

  return ObjectID().toString()
}

/**
 * generate bson object ids.
 *
 * @params type: ['time', 'hex', 'string', 'array', 'buffer', 'empty'].
 * @params code: create bson object arguments.
 * @params number: the count of generate objectId.
 *
 * return { statusCode: 200, data: { items: ['5859fd347c73221d9c7e4617'] } }
 */
router.post('/generate-object-ids', function (req, res, next) {
  var type = req.body.type;
  var code = req.body.code;
  var number = req.body.number;
  var delimiter = req.body.delimiter || ',';
  var params = [];

  if (!type) {
    var error = new Error('Miss Params');
    var item = { type: error.toString() };
    res.status(BAD_REQUEST).send({ error: error, statusCode: BAD_REQUEST, messages: [item] });
  }

  if (!number) {
    var error = new Error('Miss Params');
    var item = { number: error.toString() };
    res.status(BAD_REQUEST).send({ error: error, statusCode: BAD_REQUEST, messages: [item] });
  } else {
    number = parseInt(number, 10);
  }

  if (code) {
    params = (code + '').split(delimiter);
  }

  var index = 0;
  var param;
  var objectIds = [];
  try {
    while (index++ < number) {
      var objectId;
      if (type === PARAM_TYPES.EMPTY) {
        objectId = generateObjectId();
      } else {
        var length = params.length;
        if (length !== number) {
          throw new Error('code params length is not match the count of will generate objectIds');
        }

        switch (type) {
          case PARAM_TYPES.TIME:
            param = parseFloat(params[index - 1]);
            if (!param) {
              throw new Error('param type should be date time (in seconds)');
            }
            break;
          case PARAM_TYPES.HEX:
            // todo: to deal with big number
            param = HexConverter.decode(params[index - 1]);
            if (!param) {
              throw new Error('Param type should be a 24 character hex string');
            }
            break;
          case PARAM_TYPES.STRING:
            param = params[index - 1];
            break;
          case PARAM_TYPES.ARRAY:
            param = params[index - 1];
            param = param.spilt('|');
            break;
          case PARAM_TYPES.BUFFER:
            param = params[index - 1];
            param = new Buffer(param.spilt('|'))
            break;
        }
        objectId = generateObjectId(param);
      }

      objectIds.push(objectId)
    }
    res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { items: objectIds } });
  } catch (error) {
    var item = {};
    item[type] = error.toString();
    res.status(BAD_REQUEST).send({ error: error, statusCode: BAD_REQUEST, messages: [item] });
  }
});

/**
 * Hex encoder and decoder
 * @params type: ['encode', decode].
 * @params code: the content of convert hex
 * @params base: the base number of convert hex
 *
 * return { statusCode: 200, data: { result: '736164736164736164' } }
 */
router.post('/hex-convert', function (req, res, next) {
  var type = req.body.type;
  var code = req.body.code;
  var base = parseInt(req.body.base || 16, 10);

  if ([HEX_CONVERT_STRING_TYPES.DECODE, HEX_CONVERT_STRING_TYPES.ENCODE].indexOf(type) === -1) {
    var error = new Error('Invalid parameter of type');
    var item = { type: error.toString() };
    res.status(INVALID_PARAMETER).send({ error: error, statusCode: INVALID_PARAMETER, messages: [item] });
    return;
  }

  var converter = HexConverter[type];
  try {
    var result = converter(code, base);
    res.status(SUCCESS_CODE).send({ statusCode: SUCCESS_CODE, data: { result: result } });
  } catch (error) {
    var item = {code: error.toString()};
    res.status(INVALID_PARAMETER).send({ error: error, statusCode: INVALID_PARAMETER, messages: [item] });
  }
});

router.get('/get-file-content', function (req, res, next) {
  var url = req.query.url;
  var textContentType = 'text/plain';

  if (!url) {
    var missUrl = 'Miss url params';
    var error = new Error(missUrl);
    toolsLogger.error(__file + ' L:' + __line + ' - ', error);
    var item = { url: missUrl };
    res.status(BAD_REQUEST).send({ error: error, statusCode: BAD_REQUEST, messages: [item] });
  }

  url = decodeURIComponent(url)

  var requestHandler = function (error, response, body) {
    if (error) {
      toolsLogger.error(__file + ' L:' + __line + ' - ', error);
      var item = { url: error.message };
      res.status(INVALID_PARAMETER).send(
        { error: error, statusCode: INVALID_PARAMETER, messages: [item] });
    } else {
      if (response.headers['content-type'] === textContentType) {
        res.set('Content-Type', textContentType);
        res.status(SUCCESS_CODE).send(body);
      } else {
        var urlInvalid = 'The URL you entered is not accessible.';
        var error = new Error(urlInvalid);
        toolsLogger.error(__file + ' L:' + __line + ' - ', error);
        var item = { url: urlInvalid };
        res.status(INVALID_PARAMETER).send({ error: error, statusCode: INVALID_PARAMETER, messages: [item] });
      }
    }
  }

  request.get(url, requestHandler);
});

module.exports = router;
