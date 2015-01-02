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
var express = require('express');
var http = require('http');
var textBody = require("body");
var FinTSServer = require("../dev/FinTSServer.js");
var FinTSClient = require("../");
var should = require('should');

describe('tests',function(){
	var bankenliste = {
		'12345678':{'blz':12345678,'url':"http://TOBESET/cgi-bin/hbciservlet"},
		"undefined":{'url':""}
	};
	before(function(done) {
		// Start the Server
		var ipaddr  = process.env.IP || "127.0.0.1";//process.env.IP;
		var port      = process.env.PORT || 3000;//process.env.PORT;
		var app = express();
		var myFINTSServer = new FinTSServer();
		myFINTSServer.my_debug_log = false;
		app.configure(function () {
			app.get("/",function(req, res){
				res.setHeader('Content-Type', 'text/html');
				res.send("Test FinTS Server - at /cgi-bin/hbciservlet und BLZ = 12345678");
			});
			
			app.post("/cgi-bin/hbciservlet",function(req, res){
				textBody(req, res, function (err, body) {
					// err probably means invalid HTTP protocol or some shiz.
					if (err) {
						res.statusCode = 500;
						return res.end("NO U");
					}
					res.setHeader('Content-Type', 'text/plain');
					res.send(myFINTSServer.handleIncomeMessage(body));
				});
				
			});
		});

		var server = http.createServer(app);
		console.log('Listening at IP ' + ipaddr +' on port '+port);
		server.listen(port,ipaddr, function(){
		  var addr = server.address();
		  console.log("FinTS server running at:", addr.address + ":" + addr.port+"/cgi-bin/hbciservlet");
		  bankenliste['12345678'].url = "http://"+addr.address + ":" + addr.port+"/cgi-bin/hbciservlet";
		  myFINTSServer.my_url  = bankenliste['12345678'].url;
		  myFINTSServer.my_host = addr.address + ":" + addr.port;
		  done();
		});;
	});
	
	it('Test 1 - MsgInitDialog',function(done){
		var client = new FinTSClient(12345678,"test1","1234",bankenliste);
		var old_url = client.dest_url;
		client.MsgInitDialog(function(error,recvMsg,has_neu_url){
			if(error)
				throw error;
			client.bpd.should.have.property("vers_bpd","78");
			client.upd.should.have.property("vers_upd","3");
			client.sys_id.should.equal("DDDA10000000000000000000000A");
			client.konten.should.be.an.Array;
			client.konten.should.have.a.lengthOf(2);
			client.konten[0].iban.should.equal("DE111234567800000001");
			should(client.konten[0].sepa_data).equal(null);
			done();		
		});
	});
	it('Test 2 - MsgInitDialog wrong user',function(done){
		var client = new FinTSClient(12345678,"test2","1234",bankenliste);
		var old_url = client.dest_url;
		client.MsgInitDialog(function(error,recvMsg,has_neu_url){
			if(error){
				done();
			}else{
				throw "Erfolg sollte nicht passieren";
			}		
		});
	});
	it('Test 3 - MsgInitDialog wrong pin',function(done){
		var client = new FinTSClient(12345678,"test1","12341",bankenliste);
		var old_url = client.dest_url;
		client.MsgInitDialog(function(error,recvMsg,has_neu_url){
			if(error){
				done();
			}else{
				throw "Erfolg sollte nicht passieren";
			}		
		});
	});
	it('Test 4 - MsgEndDialog',function(done){
		var client = new FinTSClient(12345678,"test1","1234",bankenliste);
		var old_url = client.dest_url;
		client.MsgInitDialog(function(error,recvMsg,has_neu_url){
			if(error){
				throw error;
			}else{
				client.MsgEndDialog(function(error,recvMsg2){
					if(error)
						throw error;
					done();
				});
			}		
		});
	});
	it('Test 5 - MsgRequestSepa',function(done){
		var client = new FinTSClient(12345678,"test1","1234",bankenliste);
		client.MsgInitDialog(function(error,recvMsg,has_neu_url){
			if(error){
				throw error;
			}else{
				client.bpd.should.have.property("vers_bpd","78");
				client.upd.should.have.property("vers_upd","3");
				client.sys_id.should.equal("DDDA10000000000000000000000A");
				client.konten.should.be.an.Array;
				client.konten.should.have.a.lengthOf(2);
				client.konten[0].iban.should.equal("DE111234567800000001");
				should(client.konten[0].sepa_data).equal(null);
				client.MsgRequestSepa(null,function(error3,recvMsg3,sepa_list){
								if(error3)
									throw error3;
								sepa_list.should.be.an.Array;
								sepa_list[0].iban.should.equal("DE111234567800000001");
								sepa_list[0].bic.should.equal("GENODE00TES");
								done();
							});
			}		
		});
	});
	it('Test 6 - EstablishConnection',function(done){
		var client = new FinTSClient(12345678,"test1","1234",bankenliste);
		client.EstablishConnection(function(error){
			if(error){
				throw error;
			}else{
				client.bpd.should.have.property("vers_bpd","78");
				client.upd.should.have.property("vers_upd","3");
				client.sys_id.should.equal("DDDA10000000000000000000000A");
				client.konten.should.be.an.Array;
				client.konten.should.have.a.lengthOf(2);
				client.konten[0].iban.should.equal("DE111234567800000001");
				should(client.konten[0].sepa_data).not.equal(null);
				client.konten[0].sepa_data.iban.should.equal("DE111234567800000001");
				client.konten[0].sepa_data.bic.should.equal("GENODE00TES");
				done();
			}
		});
	});
	it('Test 7 - MsgGetKontoUmsaetze',function(done){
		var client = new FinTSClient(12345678,"test1","1234",bankenliste);
		client.EstablishConnection(function(error){
			if(error){
				throw error;
			}else{
				client.konten[0].sepa_data.should.not.equal(null);
				client.MsgGetKontoUmsaetze(client.konten[0].sepa_data,null,null,function(error2,rMsg,data){
					if(error2){
						throw error2;
					}else{
						// Alles gut
						should(data).not.equal(null);
						data.should.be.an.Array;
						should(data[0]).not.equal(null);
						// Testcase erweitern
						done();
					}
				});
			}
		});
	});
});