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