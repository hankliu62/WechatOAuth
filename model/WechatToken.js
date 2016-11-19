var AV = require('leanengine');

var WechatTokenName = 'WechatToken';
var WechatToken = AV.Object.extend(WechatTokenName);

/**
 * var TokenSchema = new Schema({
 *  access_token: String,
 *  expires_in: Number,
 *  refresh_token: String,
 *  openid: String,
 *  scope: String,
 *  create_at: String
 *});
 */
var WechatToken = function () {
  this.token = new WechatToken();
}

WechatToken.prototype.create = function (token) {
  var access_token = token.access_token;
  var expires_in = token.expires_in;
  var refresh_token = token.refresh_token;
  var openid = token.openid;
  var scope = token.scope;
  var create_at = token.create_at;

  this.token.set('access_token', access_token);
  this.token.set('expires_in', expires_in);
  this.token.set('refresh_token', refresh_token);
  this.token.set('openid', openid);
  this.token.set('scope', scope);
  this.token.set('create_at', create_at);

  return this.token.save().then(function (token) {
    this.token = token;
    return Promise.resolve(this.token);
  });
}

WechatToken.prototype.update = function (token) {
  var access_token = token.access_token;
  var expires_in = token.expires_in;
  var refresh_token = token.refresh_token;
  var openid = token.openid;
  var scope = token.scope;
  var create_at = token.create_at;
  if (!!access_token || !!expires_in || !!refresh_token ||
    !!openid || !!scope || !!create_at) {

    var sql = 'update ' + WechatTokenName + ' set';
    if (access_token) {
       sql += ' access_token=' + access_token;
    }
    if (expires_in) {
       sql += ' expires_in=' + expires_in;
    }
    if (refresh_token) {
       sql += ' refresh_token=' + refresh_token;
    }
    if (openid) {
       sql += ' openid=' + openid;
    }
    if (scope) {
       sql += ' scope=' + scope;
    }
    if (create_at) {
       sql += ' create_at=' + create_at;
    }

    sql += ' where objectId=' + this.token.id;

    return AV.Query.doCloudQuery(sql).then(function (updatedToken) {
      this.token = updatedToken;
      return Promise.resolve(this.token);
    });
  }
}

module.exports = WechatToken;