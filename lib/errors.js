'use strict'
var util = require('util')

var Exceptions = {}

function ParseError (area, txt, pos) {
  this.t = txt
  this.toString = function () {
    return this.t
  }
}
Exceptions.ParseError = ParseError

function OpenFinTSClientException () {
  Error.call(this) // super constructor
  Error.captureStackTrace(this, this.constructor)
}
util.inherits(OpenFinTSClientException, Error)

OpenFinTSClientException.prototype.toString = function () {
  return this.message ? this.message : 'OpenFinTSClientException'
}

Exceptions.OpenFinTSClientException = OpenFinTSClientException

function GVNotSupportedByKI (type, avail) {
  OpenFinTSClientException.call(this)
  this.gv_type = type
  this.sp_vers = avail ? [] : Object.keys(avail)
  this.message = 'There is no version of ' + this.gv_type + ' which is supported by both, the client and the server.'
}
util.inherits(GVNotSupportedByKI, OpenFinTSClientException)
Exceptions.GVNotSupportedByKI = GVNotSupportedByKI

function MalformedMessageFormat (msg) {
  OpenFinTSClientException.call(this)
  this.message = 'MalformedMessage: ' + msg
}
util.inherits(MalformedMessageFormat, OpenFinTSClientException)
Exceptions.MalformedMessageFormat = MalformedMessageFormat

function OrderFailedException (msg) {
  OpenFinTSClientException.call(this)
  this.msg_detail = msg
  this.message = 'Failed to perform Order, got error Message from Server.:' + msg.getEl(3)
}
util.inherits(OrderFailedException, OpenFinTSClientException)
Exceptions.OrderFailedException = OrderFailedException

function InternalError (msg_txt) {
  OpenFinTSClientException.call(this)
}
util.inherits(InternalError, OpenFinTSClientException)
Exceptions.InternalError = InternalError

function GVFailedAtKI (msg) {
  OpenFinTSClientException.call(this)
  this.data = msg
  this.message = 'GVFailed because Msg: ' + this.data[0] + ' - ' + this.data[2]
}
util.inherits(GVFailedAtKI, OpenFinTSClientException)
Exceptions.GVFailedAtKI = GVFailedAtKI

function ConnectionFailedException (hostname) {
  OpenFinTSClientException.call(this)
  this.host = hostname
  this.toString = function () {
    return 'Connection to ' + this.host + ' failed.'
  }
}
util.inherits(ConnectionFailedException, OpenFinTSClientException)
Exceptions.ConnectionFailedException = ConnectionFailedException

/*
function WrongUserOrPinError(){
  OpenFinTSClientException.call(this);
  this.toString = function(){
    return "Wrong user or wrong pin.";
  };
};
util.inherits(WrongUserOrPinError, OpenFinTSClientException);
Exceptions.WrongUserOrPinError = WrongUserOrPinError;
*/

function MissingBankConnectionDataException (blz) {
  OpenFinTSClientException.call(this)
  this.blz = blz
  this.toString = function () {
    return 'No connection Url in Bankenliste found to connect to blz: ' + this.blz + '.'
  }
}
util.inherits(MissingBankConnectionDataException, OpenFinTSClientException)
Exceptions.MissingBankConnectionDataException = MissingBankConnectionDataException

function OutofSequenceMessageException () {
  OpenFinTSClientException.call(this)
  this.toString = function () {
    return 'You have to ensure that only one message at a time is send to the server, use libraries like async or promisses. You can send a new message as soon as the callback returns.'
  }
}
util.inherits(OutofSequenceMessageException, OpenFinTSClientException)
Exceptions.OutofSequenceMessageException = OutofSequenceMessageException
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

module.exports = Exceptions
