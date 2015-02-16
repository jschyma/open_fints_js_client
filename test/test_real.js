/*     
 * 	  Copyright 2015 Jens Schyma jeschyma@gmail.com
 *		
 *	  This File is a Part of the source of Open-Fin-TS-JS-Client.
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 *	  Please contact Jens Schyma if you are interested in a commercial license.
 *	
 */
 "use strict";
var express = require('express');
var http = require('http');
var textBody = require("body");
var FinTSClient = require("../");
var should = require('should');

var previous_tests_ok = true;
var checkPreviousTests = function(){
	if(!previous_tests_ok) throw new Error("Vorangegangene Tests sind fehlgeschlagen, aus Sicherheitsgründen, dass der Account nicht gesperrt wird hier abbrechen.");
	previous_tests_ok = false;
};

var mocha_catcher = function(done,cb){
	return function(){
		var orig_arguments = arguments;
		try{
			cb.apply(null,orig_arguments);
		}catch(mocha_error){
			done(mocha_error);
		}
	};
};

describe('tests_real',function(){
	this.timeout(20*60*1000);
	var myFINTSServer = null;
	var credentials = null;
	before(function(done) {
		credentials = require("./credentials.js");
		/*
		module.exports = {
			bankenliste:{
				'12345678':{'blz':12345678,'url':"http://localhost:3000/cgi-bin/hbciservlet"},
				"undefined":{'url':""}
			},
			blz:12345678,
			user:"",
			pin:""
		};
		*/
		credentials.should.have.property("bankenliste");
		credentials.should.have.property("user");
		credentials.should.have.property("pin");
		credentials.should.have.property("blz");
		should(credentials.user).not.equal("");
		should(credentials.pin).not.equal("");
		done();
	});
	
	it('Test 1 - MsgInitDialog',function(done){
		checkPreviousTests();
		var client = new FinTSClient(credentials.blz,credentials.user,credentials.pin,credentials.bankenliste);
		var old_url = client.dest_url;
		client.MsgInitDialog(mocha_catcher(done,function(error,recvMsg,has_neu_url){
			if(error)
				throw error;
			client.bpd.should.have.property("vers_bpd");
			client.upd.should.have.property("vers_upd");
			client.sys_id.should.not.equal("");
			client.konten.should.be.an.Array;
			client.MsgEndDialog(mocha_catcher(done,function(error,recvMsg2){
					if(error)
						throw error;
					previous_tests_ok = true;
					done();
				}));
		}));
	});
	it('Test 2 - MsgInitDialog wrong user',function(done){
		checkPreviousTests();
		var client = new FinTSClient(credentials.blz,"wrong","12345",credentials.bankenliste);
		var old_url = client.dest_url;
		client.MsgInitDialog(mocha_catcher(done,function(error,recvMsg,has_neu_url){
			client.MsgEndDialog(function(error,recvMsg2){	});
			if(error){
				previous_tests_ok = true;
				done();
			}else{
				throw "Erfolg sollte nicht passieren";
			}
		}));
	});
	describe("wrong_pin_test",function(){
		var test_performed = false;
		after(function(done){
			if(test_performed){
				// login with good pin to reset bad counter
				var client = new FinTSClient(credentials.blz,credentials.user,credentials.pin,credentials.bankenliste);
				var old_url = client.dest_url;
				client.MsgInitDialog(function(error,recvMsg,has_neu_url){
					if(error)
						console.log(error);
					client.MsgEndDialog(function(error,recvMsg2){
							if(error)
								console.log(error);
							done();
						});		
				});
			}else{
				done();
			}
		});
		it('Test 3 - MsgInitDialog wrong pin',function(done){
			checkPreviousTests();
			test_performed = true;
			var client = new FinTSClient(credentials.blz,credentials.user,"12345",credentials.bankenliste);
			var old_url = client.dest_url;
			client.MsgInitDialog(mocha_catcher(done,function(error,recvMsg,has_neu_url){
				client.MsgEndDialog(function(error2,recvMsg2){	});
				should(error).not.be.null;
				previous_tests_ok = true;
				done();	
			}));
		});
	});
	it('Test 6 - EstablishConnection',function(done){
		checkPreviousTests();
		var client = new FinTSClient(credentials.blz,credentials.user,credentials.pin,credentials.bankenliste);
		client.EstablishConnection(mocha_catcher(done,function(error){
			if(error){
				throw error;
			}else{
				client.MsgEndDialog(function(error,recvMsg2){	});
				client.bpd.should.have.property("vers_bpd");
				client.upd.should.have.property("vers_upd");
				client.konten.should.be.an.Array;
				previous_tests_ok = true;
				done();
			}
		}));
	});
	it('Test 7 - MsgGetKontoUmsaetze',function(done){
		checkPreviousTests();
		var client = new FinTSClient(credentials.blz,credentials.user,credentials.pin,credentials.bankenliste);
		client.EstablishConnection(mocha_catcher(done,function(error){
				if(error){
					throw error;
				}else{
					client.konten[0].sepa_data.should.not.equal(null);
					client.MsgGetKontoUmsaetze(client.konten[0].sepa_data,null,null,mocha_catcher(done,function(error2,rMsg,data){
						if(error2){
							if(error2 instanceof client.Exceptions.GVNotSupportedByKI&&
							   error2.gv_type == "HIKAZ"){
								previous_tests_ok = true;
							}
							throw error2;
						}else{
							// Alles gut
							should(data).not.equal(null);
							data.should.be.an.Array;
							// Testcase erweitern
							client.MsgEndDialog(function(error,recvMsg2){	});
							previous_tests_ok = true;
							done();
						}
					}));
				}
		}));
	});
	it('Test 8 - MsgGetSaldo',function(done){
		checkPreviousTests();
		var client = new FinTSClient(credentials.blz,credentials.user,credentials.pin,credentials.bankenliste);
		client.EstablishConnection(mocha_catcher(done,function(error){
				if(error){
					throw error;
				}else{
					client.konten[0].sepa_data.should.not.equal(null);
					client.MsgGetSaldo(client.konten[0].sepa_data,null,null,mocha_catcher(done,function(error2,rMsg,data){
						// TODO Better Test Case
						if(error2){
							throw error2;
						}else{
							// Testcase erweitern
							client.MsgEndDialog(function(error,recvMsg2){	});
							previous_tests_ok = true;
							done();
						}
					}));
				}
		}));
	});
});