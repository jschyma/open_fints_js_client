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