var AV = require('leanengine');
var CONSTANTS = require('../constants/constants');

var WechatTicketName = CONSTANTS.TableNames.WECHAt_TICKET_TABLE_NAME;
var TicketTokenAV = AV.Object.extend(WechatTicketName);

/**
 * var TicketSchema = new Schema({
 *  ticket: String,
 *  expires_in: Number,
 *  create_at: String
 *});
 */
var WechatTicket = function () {
  this.ticket = new TicketTokenAV();
}

WechatTicket.prototype.create = function (ticket) {
  for (key in ticket) {
    if (ticket.hasOwnProperty(key)) {
      this.ticket.set(key, ticket[key]);
    }
  }

  return this.ticket.save().then(function (ticket) {
    this.ticket = ticket;
    return Promise.resolve(this.ticket);
  }.bind(this));
}

WechatTicket.prototype.update = function (ticket) {
  var ticket = ticket.ticket;
  var expires_in = ticket.expires_in;
  var create_at = ticket.create_at;
  if (!!ticket || !!expires_in || !!create_at) {

    var sql = 'update ' + WechatTicketName + ' set';
    if (ticket) {
       sql += ' ticket=' + ticket;
    }
    if (expires_in) {
       sql += ' expires_in=' + expires_in;
    }
    if (create_at) {
       sql += ' create_at=' + create_at;
    }

    sql += ' where objectId=' + this.ticket.objectId;

    return AV.Query.doCloudQuery(sql).then(function (updatedTicket) {
      this.ticket = updatedTicket;
      return Promise.resolve(this.ticket);
    }.bind(this));
  }
}

module.exports = WechatTicket;