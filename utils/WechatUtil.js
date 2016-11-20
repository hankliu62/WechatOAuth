var crypto = require('crypto');

var WechatUtil = {
  isValid: function (token) {
    if (token && token.access_token) {
      var createAt = new Date(token.create_at).getTime();
      var currentAt = new Date().getTime();
      var expires_in = parseInt(token.expires_in, 10);
      return currentAt < (createAt + expires_in * 1000);
    }

    return false;
  },
  sortAndParamsToString: function (args) {
    var keys = Object.keys(args);
    keys = keys.sort();
    var string = '';
    for (var key of keys) {
      string += '&' + key + '=' + args[key];
    }
    string = string.substr(1);
    return string;
  },
  createNonceStr: function () {
    return Math.random().toString(36).substr(2, 15);
  },
  createSignature: function (ticket, noncestr, timestamp, url) {
    var signatureObj = { ticket: ticket, noncestr: noncestr, timestamp: timestamp,
      url: url };
    var str = WechatUtil.sortAndParamsToString(signatureObj);
    //2. 将三个参数字符串拼接成一个字符串进行sha1加密
    var sha1Code = crypto.createHash("sha1");
    var code = sha1Code.update(str,'utf-8').digest("hex");
    return code;
  }
};

module.exports = WechatUtil