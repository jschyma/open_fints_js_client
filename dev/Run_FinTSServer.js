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
var FinTSServer = require("./FinTSServer.js");
var https = require("https");
var url = require("url");
var fs = require('fs');

var ipaddr  = process.env.IP || "127.0.0.1";//process.env.IP;
var port      = process.env.PORT || 3000;//process.env.PORT;
var app = express();
var myFINTSServer = new FinTSServer();
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
	app.post("/cgi-bin/hbciservlet_proxy",function(req2, res2){
		textBody(req2, res2, function (err, body) {
			// err probably means invalid HTTP protocol or some shiz.
			if (err) {
				res2.statusCode = 500;
				return res2.end("NO U");
			}
			// create a connection
			var post_data = body;
			var clear_txt_2 = new Buffer(body, 'base64').toString('utf8');
			console.log("Send: "+clear_txt_2);
			fs.appendFileSync("log_proxy_msg.txt","Send: "+clear_txt_2+"\n\r");
			var u = url.parse("TODO");
			var options = {
			  hostname: u.hostname,
			  port: u.port,
			  path: u.path,
			  method: 'POST',
			  headers: {
	          'Content-Type': 'text/plain',
	          'Content-Length': post_data.length
			  }
			};
			var data = "";
			var req = https.request(options, function(res) {
		  	res.on('data', function (chunk) {
					data += chunk;
		  	});
		  	res.on('end', function(){
					var clear_txt = new Buffer(data, 'base64').toString('utf8');
					console.log("Recv: "+clear_txt);
					fs.appendFileSync("log_proxy_msg.txt","Recv: "+clear_txt+"\n\r");
					res2.setHeader('Content-Type', 'text/plain');
					res2.send(data);
		  	});
		});
		
		req.on('error', function(){
			// Hier wird dann weiter gemacht :)
			res2.end();
		  });
		req.write(post_data);
		req.end();
			
		});
	});
});

var server = http.createServer(app);
console.log('Listening at IP ' + ipaddr +' on port '+port);
server.listen(port,ipaddr, function(){
  var addr = server.address();
  console.log("FinTS server running at:", addr.address + ":" + addr.port+"/cgi-bin/hbciservlet");
});;