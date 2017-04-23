'use strict'
var util = require('util')

var Exceptions = {}

function ParseError(area, txt, pos) {
  this.t = txt
  this.toString = function () {
    return this.t
  }
}
Exceptions.ParseError = ParseError;

Exceptions.OpenFinTSClientException = function () {
  Error.call(this) // super constructor
  Error.captureStackTrace(this, this.constructor)
}
util.inherits(Exceptions.OpenFinTSClientException, Error)
Exceptions.OpenFinTSClientException.prototype.toString = function () {
  return this.message ? this.message : 'OpenFinTSClientException'
}

Exceptions.GVNotSupportedByKI = function (type, avail) {
  Exceptions.OpenFinTSClientException.call(this)
  this.gv_type = type
  this.sp_vers = avail ? [] : Object.keys(avail)
  this.message = 'There is no version of ' + this.gv_type + ' which is supported by both, the client and the server.'
}
util.inherits(Exceptions.GVNotSupportedByKI, Exceptions.OpenFinTSClientException)

Exceptions.MalformedMessageFormat = function (msg) {
  Exceptions.OpenFinTSClientException.call(this)
  this.message = 'MalformedMessage: ' + msg
}
util.inherits(Exceptions.MalformedMessageFormat, Exceptions.OpenFinTSClientException)

Exceptions.OrderFailedException = function (msg) {
  Exceptions.OpenFinTSClientException.call(this)
  this.msg_detail = msg
  this.message = 'Failed to perform Order, got error Message from Server.:' + msg.getEl(3)
}
util.inherits(Exceptions.OrderFailedException, Exceptions.OpenFinTSClientException)

Exceptions.InternalError = function (msg_txt) {
  Exceptions.OpenFinTSClientException.call(this)
}
util.inherits(Exceptions.InternalError, Exceptions.OpenFinTSClientException)

Exceptions.GVFailedAtKI = function (msg) {
  Exceptions.OpenFinTSClientException.call(this)
  this.data = msg
  this.message = 'GVFailed because Msg: ' + this.data[0] + ' - ' + this.data[2]
}
util.inherits(Exceptions.GVFailedAtKI, Exceptions.OpenFinTSClientException)

Exceptions.ConnectionFailedException = function (hostname) {
  Exceptions.OpenFinTSClientException.call(this)
  this.host = hostname
  this.toString = function () {
    return 'Connection to ' + this.host + ' failed.'
  }
}
util.inherits(Exceptions.ConnectionFailedException, Exceptions.OpenFinTSClientException)

  /* Exceptions.WrongUserOrPinError = function(){
  	Exceptions.OpenFinTSClientException.call(this);
  	this.toString = function(){
  		return "Wrong user or wrong pin.";
  	};
  };
  util.inherits(Exceptions.WrongUserOrPinError, Exceptions.OpenFinTSClientException); */

Exceptions.MissingBankConnectionDataException = function (blz) {
  Exceptions.OpenFinTSClientException.call(this)
  this.blz = blz
  this.toString = function () {
    return 'No connection Url in Bankenliste found to connect to blz: ' + this.blz + '.'
  }
}
util.inherits(Exceptions.MissingBankConnectionDataException, Exceptions.OpenFinTSClientException)

Exceptions.OutofSequenceMessageException = function () {
  Exceptions.OpenFinTSClientException.call(this)
  this.toString = function () {
    return 'You have to ensure that only one message at a time is send to the server, use libraries like async or promisses. You can send a new message as soon as the callback returns.'
  }
}
util.inherits(Exceptions.OutofSequenceMessageException, Exceptions.OpenFinTSClientException)
/*
	.msg({ type:"",
	ki_type:"",
	  send_msg:{
		1:[],
		2:[],
		3:function(){}
	  },
	  recv_msg:{
		1:function(seg_vers,relatedRespSegments,releatedRespMsgs,recvMsg)
		2:
	  },
	  aufsetzpunkt_loc:[]
	});
	.done(function(error,order,recvMsg){

	});
*/



module.exports = Exceptions;