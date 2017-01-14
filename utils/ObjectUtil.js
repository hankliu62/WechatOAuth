var ObjectID = require('bson-objectid');

var ObjectUtil = {
  generateObjectId: function (param) {
    if (param) {
      return ObjectID(param).toString();
    }

    return ObjectID().toString();
  }
};

module.exports = ObjectUtil;
