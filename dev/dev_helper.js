/*     
 * 	  Copyright 2015-2016 Jens Schyma jeschyma@gmail.com
 *		
 *	  This File is a Part of the source of Open-Fin-TS-JS-Client.
 * 
 *
 *
 *  This file is licensed to you under the Apache License, Version 2.0 (the
 *  "License"); you may not use this file except in compliance
 *  with the License.  You may obtain a copy of the License at
 * 
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  or in the LICENSE File contained in this project.
 * 
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 *
 *
 *
 *  See the NOTICE file distributed with this work for additional information
 *  regarding copyright ownership.
 *
 *	
 */
// Dies ist ein Nodejs Script welches bei der Entwicklung des FinTSTestServers hilft
// es können so Nachrichten in JS Form konvertiert werden
var Nachricht = require('./lib/Classes.js').Nachricht;
var fs = require('fs');
var fints = fs.readFileSync("in_fints.txt",'utf8');
var re = /'\n/g; 
fints = fints.replace(re,"'");

var recvMsg = new Nachricht();
try{
	recvMsg.parse(fints);
	var ret = recvMsg.create_debug_js();
	console.log(ret);
	var fints = fs.writeFileSync("out_fints.txt",ret);
}catch(e){
	console.log(e.toString());
}
