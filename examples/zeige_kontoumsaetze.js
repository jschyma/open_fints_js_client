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
	Dieses Beispiel veranschaulicht wie der Client zu verwenden ist um Kontoumsätze anzuzeigen.
 */
var FinTSClient = require("../");// require("Open-Fin-TS-JS-Client");


// 1. Definition der Bankenliste - Echte URLs sind hier http://www.hbci-zka.de/institute/institut_auswahl.htm erhältlich
var bankenliste = {
		'12345678':{'blz':12345678,'url':"http://localhost:3000/cgi-bin/hbciservlet"},
		"undefined":{'url':""}
};
// 2. FinTSClient anlegen
// BLZ: 12345678
// Kunden-ID/Benutzerkennung: test1
// PIN: 1234
// Bankenliste siehe oben
var client = new FinTSClient(12345678,"test1","1234",bankenliste);
// 3. Verbindung aufbauen
client.EstablishConnection(function(error){
			if(error){
				console.log("Fehler: "+error);
			}else{
				console.log("Erfolgreich Verbunden");
				// 4. Kontoumsätze für das 1. Konto(client.konten[0]) laden
				client.MsgGetKontoUmsaetze(client.konten[0].sepa_data,null,null,function(error2,rMsg,data){
					if(error){
						console.log("Fehler beim laden der Umsätze: "+error2);
					}else{
						// Alles gut
						// 4. Umsätze darstellen
						console.log(JSON.stringify(data));
						// 5. Verbindung beenden
						client.MsgEndDialog(function(error,recvMsg2){
							// 6. Secure Daten im Objekt aus dem Ram löschen
							client.closeSecure();
							console.log("ENDE");
						});
					}
				});
			}
		});
