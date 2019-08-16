[![NPM Version][npm-image]][npm-url]
# Open-Fin-TS-JS-Client

FinTS/HBCI ist eine standardisierte Schnittstelle zur Kommunikation mit Banken von der Deutschen Kreditwirtschaft (DK).
Es existieren derzeit drei Versionen der Schnittstelle.
  * HBCI 2.2 bzw. HBCI+									- Diese API unterstützt diese Version.
  * FinTS 3.0	(noch weitestgehend auf HBCI basierend) - Diese API unterstützt diese Version.
  * FinTS 4.1	(neuste auf XML basierend)				- keine Unterstützung (noch keine große Verbreitung)

Der Open-Fin-TS-JS-Client unterstützt zurzeit nur die Version FinTS 3.0 mit der Pin/Tan Sicherheitsvariante.

Es existieren nur wenige Implementierungen für HBCI bzw. FinTS.
Zurzeit (2015) nur eine für Javascript, diese ist allerdings kommerziell. Dieses Projekt versucht diese Lücke zu schließen.

### Unterstützte Geschäftsvorfälle
  * SEPA Kontoinformationen laden (HKSPA)
  * Kontoumsätze laden (HKKAZ)
  * Salden laden (HKSAL)
  * SEPA Einzelüberweisung (HKCCS) - geplant
  * Kontoumsätze im Format camt anfordern (HKCAZ) - geplant

### Unterstützte Plattformen
  * Node-JS
  * weitere Plattformen mit Anpassungen denkbar

JS im Browser ist ohne besondere Umwege(zB Browser Extensions) aufgrund der Architektur von FinTS(Server senden keinen CORS Header) nicht möglich.

## License
	Das Projekt wurde 2015 von Jens Schyma jeschyma@gmail.com ins Leben gerufen.
  [Apache2](LICENSE)  

## Quick-Start
Der einfachste Weg ist Open-Fin-TS-JS-Client über NPM durch eine Dependency in der package.json in ein Projekt einzubinden.
Am folgenden Beispiel zum Laden von Kontoumsätzen wird gezeigt wie der Client zu bedienen ist.

```js
var FinTSClient = require("open-fin-ts-js-client");
// 1. Definition der Bankenliste - Echte URLs sind hier http://www.hbci-zka.de/institute/institut_auswahl.htm erhältlich.
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
```

## API Beschreibung
```js
	FinTSClient(in_blz,in_kunden_id,in_pin,in_bankenlist,in_logger)
		in_blz			- Die entsprechende BLZ als Zahl oder String
		in_kunden_id	- Die Benutzerkennung bzw. Kunden-ID - 9999999999 = Anonymer Benutzer
		in_pin			- Die Pin
		in_bankenlist	- Liste mit Bankdaten mit Key BLZ
					{
						'12345678': {
							'blz':12345678,
							'url':"https://localhost:3000/cgi-bin/hbciservlet"
						},
						"undefined":{'url':""}
					};
		in_logger		- Ein Bunyan Logger per default wird nichts gelogged
		
	Attribute
		= Notwendig um die Verbindung herzustellen =
		blz
		ctry			- Zurzeit immer 280 für Deutschland
		kunden_id		- 
		pin				-
		tan				- Noch NULL, da keine Geschäftsvorfälle mit Tan zurzeit unterstützt
		debug_mode		- Debug Modus (Logging)
		
		= Status des aktuellen Client Objekts =
		dialog_id		- Ein FinTSClient Objekt repräsentiert ein Dialog / dies ist die vom KI zugewiesene ID
		next_msg_nr		- Nachrichten werden Nummeriert beginnend von 1 dies ist die nächste Nummer
		client_name		- Name des Clients, sollte individuell belegt werden mit dem Namen der die API nutzenden Software
		client_version	- Version des Clients
		
		= Bank Parameter Daten und System-ID + letzte benutzte Signatur-ID
		sys_id			- vom KI zugewiesene System-ID, identifiziert diese Anwendung für den entsprechenden Benutzer eindeutig.
						  Sollte um die Generierung Unmengen neuer IDs zu vermeiden für weitere Verbindungen beibehalten werden (für immer).
		last_signatur_id - Zuletzt verwendete Signatur-ID hängt an der System-ID und gewährleistet, dass Nachrichten nicht mehrfach eingereicht werden.
		bpd				- Die Bank Parameter Daten siehe Dokumentation zu mehr Details
		{
			'vers_bpd':"0",									// Version der BPD
			'bank_name':"",									// Name der Bank
			'supported_vers':["300"],						// Unterstützte HBCI/FinTS Versionen
			'url':"",										// URL für Pin/Tan, wird durch die Bankenliste und die BLZ vorbelegt
			'pin':{
				'min_length':0,								// Minimal Länge der Pin
				'max_length':100,							// Maximal Länge der Pin
				'max_tan_length':100,						// Maximale Länger der Tan
				'txt_benutzerkennung':'Benutzerkennung',	// Vorbelegungs Text für das Feld Benutzerkennung
				'txt_kunden_id':'Kunden ID',				// Vorbelegungs Text für das Feld Kunden-ID
				'availible_seg':{							// Verfügbare Geschäftsvorfälle als Key und Wert für Tanerforderlichkeit
					'HXXXX':true,								// Wert true -> mit Tan
					'HXXXX':false								// Wert false -> ohne Tan
				}
			},
			'tan':{
				'one_step_availible':true,					// Ein-Schritt-Verfahren verfügbar
				'multiple_tan':false,						// Mehrfachtan
				'hash_type':"0",							// zu verwendender Hash Algorithmus
				'tan_verfahren':{'999':{					// Verfügbare Tan Verfahren
					'code':'999',								// Code des Verfahrens
					'one_two_step_vers':"1",					// 1-Ein Schritt-Verfahren / 2-Zwei Schritt-Verfahren
					'tech_id':'PIN',							// Technische ID des Verfahrens
					'desc':'Einfaches Pin-Verfahren',			// Lesbare Beschreibung des Verfahrens
					'max_len_tan':100,							// Maximal Länge der Tan
					'tan_alphanum':true,						// Tan Alphanumerisch?
					'txt_rueckwert':'Rückgabewert',				// Vorbelegungs Text Rückgabewert
					'max_len_rueckwert':100,					// Maximale Länge des Rückgabewerts
					'anz_tanlist':'2',							// Anzahl Tan-Listen
					'multi_tan':true,							// Mehrfachtan?
					'tan_zeit_diabez':"",						// Tan Zeit Dialog Bezug
					'tan_list_nr_req':"",						// Tan Listennummer erforderlich?
					'auftragsstorno':false,						// Auftragsstorno?
					'challange_class_req':false,				// Challange Klasse erforderlich?
					'challange_value_req':false					// Challange Wert erforderlich?
				}}
			},
			'clone':function()								// Funktion um die Daten zu Clonen
		};
		
		= User Parameter Daten =
		upd				- Die User Parameter Daten
		{
		'vers_upd':"0",										// Version der User Parameter Daten
		'geschaefts_vorg_gesp':true,						// Wie sind die nicht aufgeführten Geschäftsvorfälle zu Werten? true =  sind gesperrt / false = keine Aussage darüber treffbar
		'availible_tan_verfahren':["999"],					// Verfügbare Tan Verfahren für den Benutzer, [0] ist die aktuell verwendete
		'clone':function()									// Funktion um die Daten zu clonen
		};
		konten 			- Liste der Konten des Benutzers
		[{
		'iban':"", 					// IBAN des Kontos
		'konto_nr': 				// Konto-Nr
		'unter_konto': 				// Unterkonto Merkmal
		'ctry_code': 				// Länderkennzeichen idr. 280 für Deutschland
		'blz': 						// BLZ
		'kunden_id': 				// Kunden ID dem das Konto gehört
		'kontoar':	 				// Art des Kontos
		'currency': 				// Währung des Kontos
		'kunde1_name': 				// Name des Kunden
		'product_name': 			// Produktbezeichnung
 		'sepa_data':{				// Zusätzliche Daten für SEPA Konten, kann null sein, wenn kein SEPA Konto z.B. Depots etc.
			'is_sepa': true,			// Ist SEPA Konto?
    		'iban':"",					// IBAN
    		'bic':"",					// BIC
    		'konto_nr':"",				// Konto_NR
    		'unter_konto':"",			// Unter Konto
    		'ctry_code':"280",			// Ctry Code
    		'blz':""					// BLZ
		}
		}]
		
	Methoden
		<-- Internal -->
		clear()								-	Initialisiert alle Attribute
		getNewSigId()						-	Erzeugt eine neue Signatur ID
			returns sig_id (int)
		SendMsgToDestination(msg,callback)	-	Verschickt Nachricht per HTTPS an die Bank
			msg		(Nachricht)
			callback (function(error,msg))	=	Wird gerufen wenn Nachricht erfolgreich (error==null) verschickt + Antwort(msg instance of Nachricht) empfangen
		debugLogMsg(txt,send)				- Zum Loggen von Nachrichten
		
		<-- Public -->
		MsgInitDialog(callback)				- Initialisiert einen Dialog
			callback (function(error,recvMsg,has_neu_url))	- error == null Kein Fehler
															- recvMsg (Nachricht)
															- has_neu_url == true wenn eine andere URL zurückgemeldet wurde
		MsgEndDialog(callback)				- Beendet einen Dialog
			callback (function(error,recvMsg))				- error == null kein Fehler
															- recvMsg (Nachricht)
		EstablishConnection(callback)		- Vereinfachte Variante um eine Verbindung mit der Bank aufzubauen
			callback (function(error))						- error == null kein Fehler
																	!= null Fehler / ein MsgEndDialog ist nichtmehr erforderlich
		MsgRequestSepa(for_konto_nr,callback) - Lade SEPA Zusatz Daten (vor allem die BIC)
			for_konto_nr									- Konto-Nr für das betreffende Konto, kann aber auch weg gelassen werden, dann für alle Konten
			callback (function(error,recvMsg,sepa_list))	-error == null kein Fehler
															-recvMsg (Nachricht)
															-sepa_list [] array von Sepa Daten Format siehe UPD Konten[].sepa_data
		MsgGetKontoUmsaetze(konto,from_date,to_date,callback) - Lädt die Kontenumsätze für ein bestimmtes Konto
			konto											- Das Konto für das die Umsätze geladen werden sollen
			from_date (Date)								- vom Datum (können leer==null gelassen werden dann wird alles verfügbare geladen)
			to_date	  (Date)								- zum Datum
			callback  (function(error,recvMsg,umsaetze))	- error == null kein Fehler
															- recvMsg (Nachricht)
															- umsaetze [] Enthält die Umsatz Daten mit folgendem Format
															[{			// pro Tag ein Objekt siehe MT490 SWIFT Format
																'refnr':"STARTUMS",		// ReferenzNummer
																'bez_refnr':null,		// BezugsreferenzNummer
																'konto_bez':"12345678/0000000001",	// Kontobezeichnung BLZ/Kontonr
																'auszug_nr':"",			// Auszugsnummer
																'anfangssaldo':{
																	'isZwischensaldo':false,
																	'soll_haben' 	: 'H',
																	'buchungsdatum' : Date,
																	'currency':'EUR',
																	'value':150.22 },
																'schlusssaldo':{
																	'isZwischensaldo':false,
																	'soll_haben' 	: 'H',
																	'buchungsdatum' : Date,
																	'currency':'EUR',
																	'value':150.22 },
																'saetze':[				// Die eigentlichen Buchungssätze
																	{
																		'datum':Date,
																		'is_storno':false,
																		'soll_haben':'S',
																		'value':150.22,
																		'is_verwendungszweck_object':true,// Verwendungszweck ist Objekt?
																		'verwendungszweck': "TEXT" // oder
																			{
																				'buchungstext':"",
																				'primanoten_nr':"",
																				'text':"",
																				'bic_kontrahent':"",
																				'iban_kontrahent':"",
																				'name_kontrahent':"",
																				'text_key_addion':""
																			}
																	}
																]
															}]
		MsgGetSaldo(konto,cb)			-Lädt den Saldo eines bestimmten Kontos
			konto											- Das Konto für das der Saldo geladen werden sollen
			callback  (function(error,recvMsg,saldo))		- error == null kein Fehler
																-saldo
																{"desc":"Normalsparen",
																 "cur":"EUR",
																 "saldo":{	"soll_haben":"H",		// SALDO OBJECT
																			"buchungsdatum":Date,
																			"currency":"EUR",
																			"value":5},
																 "saldo_vorgemerkt":null,			// SALDO OBJECT
																 "credit_line":{ 	"currency":"EUR",
																					"value":5},		// BETRAG OBJECT
																 "avail_amount":null,				// BETRAG OBJECT
																 "used_amount":null,				// BETRAG OBJECT
																 "overdraft":null,					// BETRAG OBJECT
																 "booking_date":Date,
																 "faelligkeit_date":Date}
		closeSecure ()			-	Stellt sicher, dass keine Sensiblen Informationen wie die PIN noch im RAM sind, sollte am Ende immer gerufen werden
```
Besonders zu beachten ist, dass pro FinTS-Dialog, das heißt pro FinTSClient Objekt nur auf ein Callback gleichzeitig gewartet werden kann. Das liegt daran, dass das FinTS Protokoll ein sequenzielles Protokoll ist, welches nur eine Nachricht als Anfrage pro Dialog zur selben Zeit erlaubt. Der Nutzer der Client-Bibliothek hat sicherzustellen, dass nur eine Anfrage zur selben Zeit läuft. Wird dies nicht eingehalten führt die Client Library das Senden der Nachricht nicht aus und schmeißt eine Exception. Ein Beispiel das die falsche und richtige Verwendung der Client-Library zeigt:
```javascript
// Achtung: Falsche Verwendung führt zu einer Exception
client.MsgGetKontoUmsaetze(client.konten[0].sepa_data,null,null,function(error2,rMsg,data){ 
	... do something ... } );
client.MsgGetKontoUmsaetze(client.konten[1].sepa_data,null,null,function(error2,rMsg,data){
	... do something ... } );// Hier wird eine Exception geschmissen
client.MsgGetKontoUmsaetze(client.konten[2].sepa_data,null,null,function(error2,rMsg,data){
	... do something ... } );// Hier wird eine Exception geschmissen
client.MsgGetKontoUmsaetze(client.konten[3].sepa_data,null,null,function(error2,rMsg,data){
	... do something ... } );// Hier wird eine Exception geschmissen
// Richtige Aufruf Hirarchie von Mehrfachen Aufträgen pro Dialog
client.MsgGetKontoUmsaetze(client.konten[0].sepa_data,null,null,function(error2,rMsg,data){ 
	//... do something ... 
	client.MsgGetKontoUmsaetze(client.konten[1].sepa_data,null,null,function(error2,rMsg,data){
		//... do something ... 
		client.MsgGetKontoUmsaetze(client.konten[2].sepa_data,null,null,function(error2,rMsg,data){
			//... do something ... 
			client.MsgGetKontoUmsaetze(client.konten[3].sepa_data,null,null,function(error2,rMsg,data){
				//... do something ... 
				// Done
			} );
		} );
	} );	 
} );
// Die Schachtelung von Callback-Funktionen führt hier zu sehr unleserlichen Code
// Lösen können dies Biblitheken die speziell für dieses Problem entwickelt wurden
// ein Beispiel ist ASYNC vgl. https://www.npmjs.com/package/async
	var async = require("async");
	async.series([
	    function(callback){
	        client.MsgGetKontoUmsaetze(client.konten[0].sepa_data,null,null,function(error2,rMsg,data){ 
	        	//... do something ...
	        	callback(null, 'result_1');
	        });
	    },
	    function(callback){
	        client.MsgGetKontoUmsaetze(client.konten[1].sepa_data,null,null,function(error2,rMsg,data){ 
	        	//... do something ...
	        	callback(null, 'result_2');
	        });
	    },
	    // ...
	],
	function(err, results){
	    // results is now equal to ['result_1', 'result_2']
	    // done
	});
// bzw. als Schleife
	async.eachSeries([1,2,3,4], function(i, callback) {
		client.MsgGetKontoUmsaetze(client.konten[i].sepa_data,null,null,function(error2,rMsg,data){ 
	        	//... do something ...
	        	callback(null, 'result');
	        });
	},
	function(err, results){
	    // results is now equal to ['result', 'result']
	    // done
	});
```

## Entwickler-Tools

Das Projekt beinhaltet auch einen FinTS 3.0 Server.
Unterstützt wird nur das Pin/Tan Verfahren.
Der Server dient primär als Testserver für die Entwicklung der API, er wird auch für die TestCases verwendet.
  * [Server Standalone Script!](dev/Run_FinTSServer.js)

## Test-Cases

Um die Tests zu starten im Verzeichnis des Projekts folgenden Befehl in der Konsole ausführen:
```shell
npm test
```
Für die Tests wird der interne FinTS Server verwendet und die in der Datei credentials.js konfigurierten FinTS Real Server.
credentials.js
```js
	module.exports = {
		bankenliste:{
			'12345678':{'blz':12345678,'url':"http://localhost:3000/cgi-bin/hbciservlet"},
			"undefined":{'url':""}
		},
		blz:12345678,
		user:"maxmuster",
		pin:"12345",
		bunyan_live_logger:true
	};
```

Um ein Code-Coverage Test durchzuführen folgenden Befehl im Paket eingeben.
```shell
npm run coverage
```
Die Demos können auch direkt aus dem Paket ausgeführt werden.
```shell
npm run demo
```

## Logging

Logs werden mit [Bunyan](https://www.npmjs.com/package/bunyan) erstellt. Standardmäßig werden keine Logs erstellt. Soll das Logging aktiviert werden muss wie folgt ein Logger beim Aufruf des Konstruktors mitgegeben werden.
```js
	var bunyan = require("bunyan");
	var log = bunyan.createLogger({
			name: 'demo_fints_logger',
			stream: process.stdout,
			level: 'trace'
		});
	var client = new FinTSClient(12345678,"test1","1234",bankenliste,log);
```
Für eine bessere Darstellung empfiehlt sich Bunyan CLI.
```shell
node examples/zeige_kontoumsaetze.js log | bunyan -l trace
```
Alternativ können mit dem Bunyan Live Logger die Logs live dargestellt werden. Für die TestCases kann durch credentials.js und dem Attribut bunyan_live_logger:true der Live Logger direkt gestartet werden.


## Links

  * [FinTS 3.0 Spezifikation](http://www.hbci-zka.de/spec/3_0.htm)
  * [Banken URL Liste](http://www.hbci-zka.de/institute/institut_auswahl.htm)

[npm-image]: https://img.shields.io/npm/v/open-fin-ts-js-client.svg?style=flat
[npm-url]: https://npmjs.org/package/open-fin-ts-js-client
