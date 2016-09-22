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
 /*
	Zum Befüllen der Bankenliste, können die Daten aus folgendem Link abgeleitet werden.
	http://www.hbci-zka.de/institute/institut_auswahl.htm
	Soll eine vollständige Liste verfügbar gemacht werden, wenden Sie sich bitte nach folgendem Verfahren
	an http://www.hbci-zka.de/institute/institut_hersteller.htm.
	Die Liste ist hier nicht enthalten, da die Inhalte nach der Deutschen Kreditwirtschaft nicht veröffentlicht werden sollen.
 */
module.exports = {
		'12345678':{'blz':12345678,'url':"https://localhost:3000/cgi-bin/hbciservlet"},
		"undefined":{'url':""}
};
