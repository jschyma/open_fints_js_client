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
var https = require('https');
var http = require("http");
var url	 = require("url");
var bankenliste = require("./bankenliste.js");
var classes = require("./Classes.js");
var Konto       = classes.Konto;
var NULL        = classes.NULL;
var Nachricht   = classes.Nachricht;
var Helper      = classes.Helper;
var beautifyBPD = classes.beautifyBPD;
var Order		= classes.Order;
var Exceptions	= classes.Exceptions;
var MTParser	= require("./MTParser.js");
var bunyan = require('bunyan');
var encoding = require('encoding');

/*
	FinTSClient(in_blz,in_kunden_id,in_pin,in_logger)
		in_blz			- Die entsprechende BLZ als Zahl oder String
		in_kunden_id	- Die Benutzerkennung bzw. Kunden-ID - 9999999999 = Anonymer Benutzer
		in_pin			- Die Pin
		in_logger		- Ein Bunyan Logger per default wird nichts gelogged
		
	Attribute
		= Notwendig um die Verbindung herzustellen =
		blz
		ctry			- Zurzeit immer 280 für Deutschland
		kunden_id		- 
		pin				-
		tan				- Noch NULL, da keine Geschäftsvorfälle mit Tan zurzeit unterstützt
		debug_mode		- Debug Modus (Logging) sollte nicht genutzt werden, kann über ein bunyan logger auch realisiert werden
		
		= Status des aktuellen Client Objekts =
		dialog_id		- Ein FinTSClient Objekt repräsentiert ein Dialog / dies ist die vom KI zugewiesene ID
		next_msg_nr		- Nachrichten werden Nummeriert beginnend von 1 dies ist die nächste Nummer
		client_name		- Name des Clients, sollte an die entsprechende benutztende Software angepasst werden
		client_version	- Version des Clients
		
		= Bank Paramter Daten und System-ID + letzte benutzte Signatur-ID
		sys_id			- vom KI zugewiesene System-ID, identifiziert diese Anwendung für den entsprechenden Benutzer eindeutig.
						  Sollte um unnötige Anlage neuer IDs zu Vermeiden für weitere Verbindungen beibehalten werden (für immer).
		last_signatur_id - Zuletzt verwendete Signatur-ID hängt an der System-ID und gewährleistet, dass Nachrichten nicht mehrfach eingereicht werden.
		bpd				- Die Bank Paramter Daten siehe Dokumentation zu mehr Details
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
				'hash_type':"0",							// zu verwendender Hash Algorhytmus
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
			'gv_parameters':{
				"HHHH":{
					1:SEGMENT,
					2:SEGMENT
				}
			}
		};
		
		= User Paramter Daten =
		upd				- Die User Paramter Daten
		{
		'vers_upd':"0",										// Version der User Paramter Daten
		'geschaefts_vorg_gesp':true,						// Wie sind die nicht aufgeführten Geschäftsvorfälle zu Werten? true =  sind gesperrt / false = Keine Aussage darüber treffbar
		'availible_tan_verfahren':["999"],					// Verfügbare Tan Verfahren für den Benutzer, [0] ist die aktuell verwendete
		'clone':function()									// Funktion um die Daten zu Clonen
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
		
*/
var FinTSClient = function (in_blz,in_kunden_id,in_pin,bankenlist,logger) {
    var me 					= this;
	me.Exceptions			= Exceptions;
	// Logger
	me.log					= {
		'main':(logger?logger:bunyan.createLogger({name: "open-fin-ts-js-client",streams:[]}))
	};
	me.log.con	=	me.log.main.child({area: 'connection'});
	me.log.conest	=	me.log.main.child({area: 'connection_establish'});
	me.log.gv	=	me.log.main.child({area: 'gv'});
	// Other
    me.blz 					= in_blz;
    me.ctry 				= 280;
    me.kunden_id   			= Helper.escapeUserString(in_kunden_id);
	me.pin		   			= Helper.escapeUserString(in_pin);
	me.tan		   			= NULL;
	me.debug_mode			= false;
	
    // Technical
    me.dialog_id   			= 0;
    me.next_msg_nr 			= 1;
    me.client_name 			= "Open-FinTS-JS-Client";
    me.client_version 		= 4;
	me.proto_version		= 300;// 300=FinTS;220=HBCI 2.2
	
	// BPD und System-Id mit Letzt benutzter Signatur ID
	me.sys_id				= 0;
	me.last_signatur_id 	= 1;
	me.bpd					= {	};
	me.bpd.url 				= "";
    
	// UPD - Data
	me.upd = {	};
	me.konten = [];
    
    me.clear = function(){
    	me.dialog_id    = 0;
	    me.next_msg_nr  = 1;
		me.sys_id		= 0;
		me.last_signatur_id = 1;
		me.bpd			={
			'vers_bpd':"0",
			'bank_name':"",
			'supported_vers':["300"],
			'url':"",
			'pin':{
				'min_length':0,
				'max_length':100,
				'max_tan_length':100,
				'txt_benutzerkennung':'Benutzerkennung',
				'txt_kunden_id':'Kunden ID',
				'availible_seg':{}
			},
			'tan':{
				'one_step_availible':true,
				'multiple_tan':false,
				'hash_type':"0",
				'tan_verfahren':{'999':{
					'code':'999',
					'one_two_step_vers':"1",
					'tech_id':'PIN',
					'desc':'Einfaches Pin-Verfahren',
					'max_len_tan':100,
					'tan_alphanum':true,
					'txt_rueckwert':'Rückgabewert',
					'max_len_rueckwert':100,
					'anz_tanlist':'2',
					'multi_tan':true,
					'tan_zeit_diabez':"",
					'tan_list_nr_req':"",
					'auftragsstorno':false,
					'challange_class_req':false,
					'challange_value_req':false
				}}
			},
			'clone':function(){return JSON.parse(JSON.stringify(this));},
			'gv_parameters':{}			
		};
        
        try {
            me.bpd.url = bankenlist == undefined ? bankenliste["" + in_blz].url : bankenlist["" + in_blz].url;
        } catch (e) {
            throw new Error('no valid entry for blz found in list');
        }
	    
    	me.upd = {
			'vers_upd':"0",
			'geschaefts_vorg_gesp':true,
			'availible_tan_verfahren':["999"],
			'clone':function(){return JSON.parse(JSON.stringify(this));}
		};
		me.konten = [];
    };
    me.clear();
    
    me.closeSecure = function(){
			me.bpd = null;
			me.upd = null;
			me.konten = null;
			me.pin = null;
			me.tan = null;
			me.sys_id = null;
	};
    
    me.getNewSigId = function(){
    	var next = (new Date()).getTime();
    	if(next>me.last_signatur_id){
    		me.last_signatur_id = next;
    		return me.last_signatur_id;
    	}else{
    		me.last_signatur_id++;
    		return me.last_signatur_id;
    	}
    };
    
    me.MsgInitDialog = function(cb){
        var msg = new Nachricht(me.proto_version);
		if(me.kunden_id!=9999999999)msg.sign({'pin':me.pin,'tan':NULL,'sys_id':me.sys_id,'pin_vers':me.upd.availible_tan_verfahren[0],'sig_id':me.getNewSigId()});
        msg.init(me.dialog_id, me.next_msg_nr,me.blz,me.kunden_id);
        me.next_msg_nr++;
        //  Kundensystem-ID  = 0; Kundensystemssatus = 0
        msg.addSeg(Helper.newSegFromArray("HKIDN", 2, [[me.ctry, me.blz], me.kunden_id , me.sys_id, 1]));
        // BPD Vers = 0; UPD Vers = 0; Dialogspr. = 0
        var HKVVB = Helper.newSegFromArray("HKVVB", 3, [me.bpd.vers_bpd, me.upd.vers_upd, 0, me.client_name, me.client_version]);
        msg.addSeg(HKVVB);
		if(me.kunden_id!=9999999999&&me.sys_id==0)var syn=msg.addSeg(Helper.newSegFromArray("HKSYN",me.proto_version==220?2:3,[0]));// Synchronisierung starten
		me.log.gv.debug({gv:"HKVVB"},"Send HKVVB,HKIDN");
	   me.SendMsgToDestination(msg,function(error,recvMsg){
			if(error){
				me.log.gv.error(error,{gv:"HKVVB"},"Could not send HKVVB,HKIDN");
				try{
					cb(error,recvMsg,false);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKVVB"},"Unhandled callback Error in HKVVB,HKIDN");
				}
			}else{
				// Prüfen ob Erfolgreich
				var HIRMG = null;
				try{HIRMG = recvMsg.selectSegByName("HIRMG")[0];}catch(e){};
				if(HIRMG!=null&&(HIRMG.getEl(1).getEl(1)=="0010"||HIRMG.getEl(1).getEl(1)=="3060")){
					if(Helper.checkMsgsWithBelongToForId(recvMsg,HKVVB.nr,"0020")){
					try{
						// 1. Dialog ID zuweisen
						me.dialog_id = recvMsg.selectSegByName("HNHBK")[0].getEl(3);
						// 2. System Id
						if(me.kunden_id!=9999999999&&me.sys_id==0){
							me.sys_id = recvMsg.selectSegByNameAndBelongTo("HISYN",syn)[0].getEl(1);
						}
						// 3. Möglicherweise neue kommunikationsdaten
						var HIKOM = recvMsg.selectSegByName("HIKOM");
						HIKOM = HIKOM.length>0?HIKOM[0]:null;
						var neu_url = me.bpd.url;
						if(HIKOM){
							for(var i=2; i<HIKOM.store.data.length;i++){
								// There can be up to 9 Kommunikationsparameter
								//  however we check only if the first one which is HTTP (3)
								//	is different to the one we used before, according to the spec we should try reconnecting all 9
								if(HIKOM.store.data[i].getEl(1)=="3"){
									neu_url = (Helper.convertFromToJSText(HIKOM.store.data[i].getEl(2)));
									if(neu_url.indexOf("http")!=0){
										neu_url = "https://"+neu_url;
									}
									break;
								}
							}
						}
						var has_neu_url = false;
						if(neu_url!=me.bpd.url){
							has_neu_url = true;
						}
						// 4. Mögliche KontoInformationen
						if(me.konten.length==0){
							var konto_list = recvMsg.selectSegByName("HIUPD");
							for(var i=0;i!=konto_list.length;i++){
								var konto = new Konto();
								konto.iban 			= konto_list[i].getEl(2);
								konto.konto_nr 		= konto_list[i].getEl(1).getEl(1);
								konto.unter_konto 	= konto_list[i].getEl(1).getEl(2);
								konto.ctry_code 	= konto_list[i].getEl(1).getEl(3);
								konto.blz 			= konto_list[i].getEl(1).getEl(4);
								konto.kunden_id 	= konto_list[i].getEl(3);
								konto.kontoar	 	= konto_list[i].getEl(4);
								konto.currency 		= konto_list[i].getEl(5);
								konto.kunde1_name 	= konto_list[i].getEl(6);
								konto.product_name 	= konto_list[i].getEl(8);
								konto.sepa_data		= null;
								me.konten.push(konto);
							}
						}
						// 5. Analysiere BPD
						try{
							// 5.1 Vers
							var HIBPA 			= recvMsg.selectSegByName("HIBPA")[0];
							me.bpd.vers_bpd  	= HIBPA.getEl(1);
							// 5.2 sonst
							me.bpd.bank_name 		= HIBPA.getEl(3);
							me.bpd.supported_vers 	= Helper.convertIntoArray(HIBPA.getEl(6));
							me.bpd.url 				= neu_url;
						}catch(ee){me.log.gv.error(ee,{gv:"HIBPA"},"Error while analyse BPD");}
						if(me.proto_version==300){
							try{
								// 5.3 Pins
								var pin_data = recvMsg.selectSegByName("HIPINS")[0].getEl(4);
								me.bpd.pin.min_length 			= pin_data.getEl(1);
								me.bpd.pin.max_length 			= pin_data.getEl(2);
								me.bpd.pin.max_tan_length 		= pin_data.getEl(3);
								me.bpd.pin.txt_benutzerkennung  = pin_data.getEl(4);
								me.bpd.pin.txt_kunden_id 		= pin_data.getEl(5);
								// 5.3.2 Tanerforderlichkeit für die Geschäftsvorfälle
								me.bpd.pin.availible_seg = {};// true and false für ob Tan erforderlich
								for(var i=5;i<pin_data.data.length;i++){
									me.bpd.pin.availible_seg[pin_data.data[i]]=pin_data.data[i+1].toUpperCase()=="J";
									i++;
								}
							}catch(ee){me.log.gv.error(ee,{gv:"HIPINS"},"Error while analyse HIPINS");}
						}else{
							var pin_data_spk = recvMsg.selectSegByName("DIPINS");
							if(pin_data_spk.length>0){
								try{
									// 5.3 Pins
									pin_data_spk 					= pin_data_spk[0];
									/*me.bpd.pin.min_length 		= ;
									me.bpd.pin.max_length 			= ;
									me.bpd.pin.max_tan_length 		= ;
									me.bpd.pin.txt_benutzerkennung  = ;
									me.bpd.pin.txt_kunden_id 		= ;*/
									// 5.3.2 Tanerforderlichkeit für die Geschäftsvorfälle
									me.bpd.pin.availible_seg = {};// true and false für ob Tan erforderlich
									var pin_tan_spk_data = pin_data_spk.getEl(3).data;
									for(var i=0;i<pin_tan_spk_data.length;i++){
										me.bpd.pin.availible_seg[pin_tan_spk_data[i]]=pin_tan_spk_data[i+1].toUpperCase()=="J";
										i++;
									}
								}catch(ee){me.log.gv.error(ee,{gv:"DIPINS"},"Error while analyse HIPINS");}
							}else{
								me.log.gv.warning({gv:"HIPINS"},"Becuase it is 2.2 no HIPINS and no DIPINS.");
							}
						}
						try{
							// 5.4 Tan
							var HITANS = recvMsg.selectSegByName("HITANS")[0];
							if(HITANS.vers==5){
								var tan_data = HITANS.getEl(4);
								me.bpd.tan.one_step_availible = tan_data.getEl(1).toUpperCase()=="J";
								me.bpd.tan.multiple_tan	      = tan_data.getEl(2).toUpperCase()=="J";
								me.bpd.tan.hash_type	      = tan_data.getEl(3);
								me.bpd.tan.tan_verfahren = {};
								for(var i=3;i<tan_data.data.length;i++){
									var sicherheitsfunktion = {};
									sicherheitsfunktion.code 				= tan_data.data[i];
									sicherheitsfunktion.one_two_step_vers 	= tan_data.data[i+1];// "1": Einschrittverfahren, "2": Zweischritt
									sicherheitsfunktion.tech_id				= tan_data.data[i+2];
									sicherheitsfunktion.zka_tan_verfahren	= tan_data.data[i+3];
									sicherheitsfunktion.vers_zka_tan_verf	= tan_data.data[i+4];
									sicherheitsfunktion.desc				= tan_data.data[i+5];
									sicherheitsfunktion.max_len_tan			= tan_data.data[i+6];
									sicherheitsfunktion.tan_alphanum		= tan_data.data[i+7]=="2";
									sicherheitsfunktion.txt_rueckwert		= tan_data.data[i+8];
									sicherheitsfunktion.max_len_rueckwert	= tan_data.data[i+9];
									sicherheitsfunktion.anz_tanlist			= tan_data.data[i+10];
									sicherheitsfunktion.multi_tan			= tan_data.data[i+11].toUpperCase()=="J";
									sicherheitsfunktion.tan_zeit_diabez		= tan_data.data[i+12];
									sicherheitsfunktion.tan_list_nr_req		= tan_data.data[i+13];
									sicherheitsfunktion.auftragsstorno		= tan_data.data[i+14].toUpperCase()=="J";
									sicherheitsfunktion.sms_abu_konto_req	= tan_data.data[i+15];
									sicherheitsfunktion.auftrag_konto		= tan_data.data[i+16];
									sicherheitsfunktion.challange_class_req = tan_data.data[i+17].toUpperCase()=="J";
									sicherheitsfunktion.challange_structured = tan_data.data[i+18].toUpperCase()=="J";
									sicherheitsfunktion.initialisierungs_mod = tan_data.data[i+19];
									sicherheitsfunktion.bez_tan_med_req		 = tan_data.data[i+20];
									sicherheitsfunktion.anz_supported_tan_vers = tan_data.data[i+21];
									//sicherheitsfunktion.challange_value_req = tan_data.data[i+14].toUpperCase()=="J";
									me.bpd.tan.tan_verfahren[sicherheitsfunktion.code]=sicherheitsfunktion;
									i+=21;
								}
							}
						}catch(ee){me.log.gv.error(ee,{gv:"HITANS"},"Error while analyse HITANS");}
						// 6. Analysiere UPD
						try{
							var HIUPA = recvMsg.selectSegByName("HIUPA")[0];
							me.upd.vers_upd = HIUPA.getEl(3);
							me.upd.geschaefts_vorg_gesp = HIUPA.getEl(4)=="0"; // UPD-Verwendung
						}catch(ee){me.log.gv.error(ee,{gv:"HIUPA"},"Error while analyse UPD");}
						// 7. Analysiere Verfügbare Tan Verfahren
						try{
							var HIRMS_for_tanv = recvMsg.selectSegByNameAndBelongTo("HIRMS",HKVVB.nr)[0];
							for(var i=0;i!=HIRMS_for_tanv.store.data.length;i++){
								if(HIRMS_for_tanv.store.data[i].getEl(1)=="3920"){
									me.upd.availible_tan_verfahren=[];
									for(var a=3;a<HIRMS_for_tanv.store.data[i].data.length;a++){
										me.upd.availible_tan_verfahren.push(HIRMS_for_tanv.store.data[i].data[a]);
									}
									if(me.upd.availible_tan_verfahren.length>0)
										me.log.gv.info({gv:"HKVVB"},"Update to use Tan procedure: "+me.upd.availible_tan_verfahren[0]);
									break;
								}
							}
						}catch(ee){me.log.gv.error(ee,{gv:"HKVVB"},"Error while analyse HKVVB result Tan Verfahren");}
						// 8. Analysiere Geschäftsvorfallparameter
						try{
							for(var i in recvMsg.segments){
								if(recvMsg.segments[i].name.length>=6&&recvMsg.segments[i].name.charAt(5)=="S"){
									var gv = recvMsg.segments[i].name.substring(0,5);
									if(!(gv in me.bpd.gv_parameters)){
										me.bpd.gv_parameters[gv]={};
									}
									me.bpd.gv_parameters[gv][recvMsg.segments[i].vers]=recvMsg.segments[i];
								}
							}
						}catch(ee){me.log.gv.error(ee,{gv:"HKVVB"},"Error while analyse HKVVB result Tan Verfahren");}
						try{
							cb(error,recvMsg,has_neu_url);
						}catch(cb_error){
							me.log.gv.error(cb_error,{gv:"HKVVB"},"Unhandled callback Error in HKVVB,HKIDN");
						}
					}catch(e){
						me.log.gv.error(e,{gv:"HKVVB"},"Error while analyse HKVVB Response");
						try{
							cb(e.toString(),null,false);
						}catch(cb_error){
							me.log.gv.error(cb_error,{gv:"HKVVB"},"Unhandled callback Error in HKVVB,HKIDN");
						}
					}
					}else{
						me.log.gv.error({gv:"HKVVB"},"Error while analyse HKVVB Response No Init Successful recv.");
						try{
							cb("Keine Initialisierung Erfolgreich Nachricht erhalten!",recvMsg,false);
						}catch(cb_error){
							me.log.gv.error(cb_error,{gv:"HKVVB"},"Unhandled callback Error in HKVVB,HKIDN");
						}
					}
				}else{
					me.log.gv.error({gv:"HKVVB",hirmsg:HIRMG},"Error while analyse HKVVB Response Wrong HIRMG response code");
					try{
						cb("Fehlerhafter Rückmeldungscode: "+(HIRMG===null?"keiner":HIRMG.getEl(1).getEl(3)),recvMsg,false);
					}catch(cb_error){
						me.log.gv.error(cb_error,{gv:"HKVVB"},"Unhandled callback Error in HKVVB,HKIDN");
					}
				}
			}
		});
    };
    
	
	me.MsgCheckAndEndDialog = function(recvMsg,cb){
		var HIRMGs = recvMsg.selectSegByName("HIRMG");
		for(var k in HIRMGs){
			for(var i in (HIRMGs[k].store.data)){
				var ermsg = HIRMGs[k].store.data[i].getEl(1);
				if(ermsg=="9800"){
					try{
						cb(null,null);
					}catch(cb_error){
						me.log.gv.error(cb_error,{gv:"HKEND"},"Unhandled callback Error in HKEND");
					}
					return;
				}
			}
		}
		me.MsgEndDialog(cb);
	};
	me.MsgEndDialog = function(cb){
		var msg = new Nachricht(me.proto_version);
		if(me.kunden_id!=9999999999)msg.sign({'pin':me.pin,'tan':NULL,'sys_id':me.sys_id,'pin_vers':me.upd.availible_tan_verfahren[0],'sig_id':me.getNewSigId()});
        msg.init(me.dialog_id, me.next_msg_nr,me.blz,me.kunden_id);
        me.next_msg_nr++;
		msg.addSeg(Helper.newSegFromArray("HKEND", 1, [me.dialog_id]));
		me.SendMsgToDestination(msg,function(error,recvMsg){
			if(error){
				me.log.gv.error(error,{gv:"HKEND",msg:msg},"HKEND could not be send");
			}
			try{
				cb(error,recvMsg);
			}catch(cb_error){
				me.log.gv.error(cb_error,{gv:"HKEND"},"Unhandled callback Error in HKEND");
			}
		});
	};
	
	// SEPA kontoverbindung anfordern HKSPA, HISPA ist die antwort
	me.MsgRequestSepa = function(for_konto,cb){
		//Vars
		var processed = false;
		var v1=null;
		var aufsetzpunkt_loc = 0;
		var sepa_list=new Array();
		// Create Segment
	    if(for_konto){
	        v1 = [[280,for_konto]];
			aufsetzpunkt_loc = 2;
	    }else{
			v1 = [];
			aufsetzpunkt_loc = 1;
		}
		// Start
		var req_sepa = new Order(me);
		req_sepa.msg({
			type:"HKSPA",
			ki_type:"HISPA",
			aufsetzpunkt_loc:[aufsetzpunkt_loc],
			send_msg:{
				1:v1,
				2:v1,
				3:v1
			  },
			  recv_msg:req_sepa.Helper().vers([1,2,3],function(seg_vers,relatedRespSegments,relatedRespMsgs,recvMsg){
					try{
						if(req_sepa.checkMessagesOkay(relatedRespMsgs,true)){
							var HISPA = req_sepa.getSegByName(relatedRespSegments,"HISPA");
							if(HISPA!=null){
								for(var i=0;i!=HISPA.store.data.length;i++){
									var verb = HISPA.getEl(i+1);
									var o = {};
									o.is_sepa = verb.getEl(1)=="J";
									o.iban    = verb.getEl(2);
									o.bic     = verb.getEl(3);
									o.konto_nr = verb.getEl(4);
									o.unter_konto = verb.getEl(5);
									o.ctry_code = verb.getEl(6);
									o.blz        = verb.getEl(7);
									sepa_list.push(o);
								}
								try{
									cb(null,recvMsg,sepa_list);
								}catch(cb_error){
									me.log.gv.error(cb_error,{gv:"HKSPA"},"Unhandled callback Error in HKSPA");
								}
							}else{
								throw new Error("TODO ausführlicherer Error");
							}
						}
					}catch(e){
						me.log.gv.error(e,{gv:"HKSPA",msgs:relatedRespMsgs,segments:relatedRespSegments},"Exception while parsing HKSPA response");
						try{
								cb(e,null,null);
						}catch(cb_error){
							me.log.gv.error(cb_error,{gv:"HKSPA"},"Unhandled callback Error in HKSPA");
						}
					}
					processed = true;
			  }).done()
		});
		req_sepa.done(function(error,order,recvMsg){
			if(error&&!processed){
				me.log.gv.error(error,{gv:"HKSPA",recvMsg:recvMsg},"Exception while parsing HKSPA");
				try{
					cb(error,recvMsg,null);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKSPA"},"Unhandled callback Error in HKSPA");
				}
			}else if(!processed){
				error = new Exceptions.InternalError("HKSPA response was not analysied");
				me.log.gv.error(error,{gv:"HKSPA",recvMsg:recvMsg},"HKSPA response was not analysied");
				try{
					cb(error,recvMsg,null);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKSPA"},"Unhandled callback Error in HKSPA");
				}
			}
			
		});
	};
	
	/*
		konto = {iban,bic,konto_nr,unter_konto,ctry_code,blz}
		from_date
		to_date		können null sein
		cb
	*/
	me.MsgGetKontoUmsaetze = function(konto,from_date,to_date,cb){
		var processed = false;
		var v7=null;
        var v5=null;
		if(from_date==null&&to_date==null){
            v5 = [[konto.konto_nr,konto.unter_konto,konto.ctry_code,konto.blz],"N"];
			v7 = [[konto.iban,konto.bic,konto.konto_nr,konto.unter_konto,konto.ctry_code,konto.blz],"N"];
		}else{
            v5 = [[konto.konto_nr,konto.unter_konto,konto.ctry_code,konto.blz],"N",from_date!=null?Helper.convertDateToDFormat(from_date):"",to_date!=null?Helper.convertDateToDFormat(to_date):""];
			v7 = [[konto.iban,konto.bic,konto.konto_nr,konto.unter_konto,konto.ctry_code,konto.blz],"N",from_date!=null?Helper.convertDateToDFormat(from_date):"",to_date!=null?Helper.convertDateToDFormat(to_date):""];
		}
		// Start
		var req_umsaetze = new Order(me);
        var recv = function(seg_vers,relatedRespSegments,relatedRespMsgs,recvMsg){
            try{
                if(req_umsaetze.checkMessagesOkay(relatedRespMsgs,true)){
                    // Erfolgreich Meldung
                    var txt = "";
                    for(var i in relatedRespSegments){
                        if(relatedRespSegments[i].name=="HIKAZ"){
                            var HIKAZ = relatedRespSegments[i];
                            txt += HIKAZ.getEl(1);
                        }
                    }
                    var mtparse = new MTParser();
                    mtparse.parse(txt);
                    var umsatze = mtparse.getKontoUmsaetzeFromMT490();
                    // Callback
                    try{
                        cb(null,recvMsg,umsatze);
                    }catch(cb_error){
                        me.log.gv.error(cb_error,{gv:"HKKAZ"},"Unhandled callback Error in HKKAZ");
                    }
                }
            }catch(ee){
                me.log.gv.error(ee,{gv:"HKKAZ",resp_msg:recvMsg},"Exception while parsing HKKAZ response");
                // Callback
                try{
                    cb(ee,recvMsg,null);
                }catch(cb_error){
                    me.log.gv.error(cb_error,{gv:"HKKAZ"},"Unhandled callback Error in HKKAZ");
                }
            }
            processed = true;
        };
		// TODO check if we can do the old or the new version HKCAZ 
		req_umsaetze.msg({
			type:"HKKAZ",
			ki_type:"HIKAZ",
			aufsetzpunkt_loc:[6],
			send_msg:{
				7:v7,
                5:v5
			},
			recv_msg:{
				7:recv,
                5:recv
            }
		});
		req_umsaetze.done(function(error,order,recvMsg){
			if(error&&!processed){
				me.log.gv.error(error,{gv:"HKKAZ",recvMsg:recvMsg},"HKKAZ could not be send");
				// Callback
				try{
					cb(error,recvMsg,null);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKKAZ"},"Unhandled callback Error in HKKAZ");
				}
			}else if(!processed){
				error = new Exceptions.InternalError("HKKAZ response was not analysied");
				me.log.gv.error(error,{gv:"HKKAZ",recvMsg:recvMsg},"HKKAZ response was not analysied");
				// Callback
				try{
					cb(error,recvMsg,null);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKKAZ"},"Unhandled callback Error in HKKAZ");
				}
			}
		});
	};
	
	/*
		konto = {iban,bic,konto_nr,unter_konto,ctry_code,blz}
		cb
	*/
	me.MsgGetSaldo = function(konto,cb){
		var req_saldo = new Order(me);
		var processed = false;
		var v5 = null;
		var v7 = null;
		var avail_send_msg = {};
		if('iban' in konto&&'bic' in konto&&req_saldo.checkKITypeAvailible("HISAL",[7])){
			var konto_verb_int = [konto.iban,konto.bic,konto.konto_nr,konto.unter_konto,konto.ctry_code,konto.blz];
			v7 = [konto_verb_int,"N"];
			avail_send_msg[7]=v7;
		}else{
			var konto_verb = [konto.konto_nr,konto.unter_konto,konto.ctry_code,konto.blz];
			v5 = [konto_verb,"N"];
			avail_send_msg[5]=v5;
			avail_send_msg[6]=v5;
		}
		// Start
		req_saldo.msg({
			type:"HKSAL",
			ki_type:"HISAL",
			send_msg:avail_send_msg,
			recv_msg:req_saldo.Helper().vers([5,6,7],function(seg_vers,relatedRespSegments,relatedRespMsgs,recvMsg){
					try{
						if(req_saldo.checkMessagesOkay(relatedRespMsgs,true)){
							var HISAL = req_saldo.getSegByName(relatedRespSegments,"HISAL");
							if(HISAL!=null){
								try{
									var result ={
										desc:				req_saldo.getElFromSeg(HISAL,2,null),
										cur:				req_saldo.getElFromSeg(HISAL,3,null),
										saldo:				Helper.getSaldo(HISAL,4,false),
										saldo_vorgemerkt:	Helper.getSaldo(HISAL,5,false),
										credit_line:		Helper.getBetrag(HISAL,6),
										avail_amount:		Helper.getBetrag(HISAL,7),
										used_amount:		Helper.getBetrag(HISAL,8),
										overdraft:			null,
										booking_date:		null,
										faelligkeit_date:	Helper.getJSDateFromSeg(HISAL,11)
									};
									if(seg_vers==5){
										result.booking_date = Helper.getJSDateFromSeg(HISAL,9,10);
									}else{
										result.booking_date = Helper.getJSDateFromSegTSP(HISAL,11);
										result.overdraft    = Helper.getBetrag(HISAL,9);
									}
									cb(null,recvMsg,result);
								}catch(cb_error){
									me.log.gv.error(cb_error,{gv:"HKSAL"},"Unhandeled callback Error in HKSAL");
								}
							}else{
								throw new Error("TODO ausführlicherer Error");
							}
						}
					}catch(e){
						me.log.gv.error(e,{gv:"HKSAL",msgs:relatedRespMsgs,segments:relatedRespSegments},"Exception while parsing HKSAL response");
						try{
								cb(e,null,null);
						}catch(cb_error){
							me.log.gv.error(cb_error,{gv:"HKSAL"},"Unhandeled callback Error in HKSAL");
						}
					}
					processed = true;
			  }).done()
		});
		req_saldo.done(function(error,order,recvMsg){
			if(error&&!processed){
				me.log.gv.error(error,{gv:"HKSAL",recvMsg:recvMsg},"Exception while parsing HKSAL");
				try{
					cb(error,recvMsg,null);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKSAL"},"Unhandeled callback Error in HKSAL");
				}
			}else if(!processed){
				error = new Exceptions.InternalError("HKSAL response was not analysed");
				me.log.gv.error(error,{gv:"HKSAL",recvMsg:recvMsg},"HKSAL response was not analysed");
				try{
					cb(error,recvMsg,null);
				}catch(cb_error){
					me.log.gv.error(cb_error,{gv:"HKSAL"},"Unhandled callback Error in HKSAL");
				}
			}
			
		});
	};
	me.EstablishConnection = function(cb){
		var protocol_switch = false;
		var vers_step    = 1;
		var original_bpd = me.bpd.clone();original_bpd.clone = me.bpd.clone;
		var original_upd = me.upd.clone();original_upd.clone = me.upd.clone;
		// 1. Normale Verbindung herstellen um BPD zu bekommen und evtl. wechselnde URL ( 1.versVersuch FinTS 2. versVersuch HBCI2.2 )
		// 2. Verbindung mit richtiger URL um auf jeden Fall (auch bei geänderter URL) die richtigen BPD zu laden + Tan Verfahren herauszufinden
		// 3. Abschließende Verbindung aufbauen
		var perform_step = function(step){
			me.MsgInitDialog(function(error,recvMsg,has_neu_url){
				if(error){
					me.MsgCheckAndEndDialog(recvMsg,function(error2,recvMsg2){if(error2){me.log.conest.error({step:step,error:error2},"Connection close failed.");}else{me.log.conest.debug({step:step},"Connection closed okay.");}});
					if(vers_step==1){
						try{
							var HIRMS = recvMsg.selectSegByNameAndBelongTo("HIRMS",1)[0];
                            
							if(HIRMS && HIRMS.getEl(1).getEl(1)=="9120"){
								me.log.conest.debug({step:step,hirms:HIRMS},"Test Switch Version from FinTS to HBCI2.2");
								me.proto_version = 220;
								vers_step = 2;
								protocol_switch = true;
								me.clear();
								perform_step(1);
							} else {
                                var undefError = 'HIRMS Response is undefined';
                                try {
                                    cb(undefError);
                                } catch (cb_error) {
                                    me.log.conest.error(cb_error, { step: step, error2: undefError }, "Init Dialog failed and no switch version: " + undefError);
                                }
                            }
						}catch(error){
                            try {
                                cb(error);
                            } catch (cb_error) {
                                me.log.conest.error(cb_error, { step: step, error2: error }, "Init Dialog failed and no switch version: " + error);
                            }
						}
					}else if(protocol_switch){
						me.log.conest.error({step:step,hirms:HIRMS,error:error},"Test Switch Version from FinTS to HBCI2.2 failed.E:"+error);
						me.proto_version = 300;
						// Callback
						try{
							cb(error);
						}catch(cb_error){
							me.log.conest.error(cb_error,{step:step},"Unhandled callback Error in EstablishConnection");
						}
					}else{
						me.log.conest.error({step:step,error:error},"Init Dialog failed: "+error);
						// Callback
						try{
							cb(error);
						}catch(cb_error){
							me.log.conest.error(cb_error,{step:step},"Unhandled callback Error in EstablishConnection");
						}
					}
				}else{
					// Erfolgreich Init Msg verschickt
					me.log.conest.debug({step:step,bpd:beautifyBPD(me.bpd),upd:me.upd,url:me.bpd.url,new_sig_method:me.upd.availible_tan_verfahren[0]},"Init Dialog successful.");
					if(step==1||step==2){
						// Im Step 1 und 2 bleiben keine Verbindungen erhalten
						// Diese Verbindung auf jeden Fall beenden
						var neu_url = me.bpd.url;
						var neu_sig_method = me.upd.availible_tan_verfahren[0];
						me.bpd = original_bpd.clone();
						me.upd = original_upd.clone();
						var orig_sys_id   = me.sys_id;
						var orig_last_sig = me.last_signatur_id;
						me.MsgCheckAndEndDialog(recvMsg,function(error2,recvMsg2){if(error2){me.log.conest.error({step:step,error:error2},"Connection close failed.");}else{me.log.conest.debug({step:step},"Connection closed okay.");}});
						me.clear();
						me.bpd.url 						  = neu_url;
						me.upd.availible_tan_verfahren[0] = neu_sig_method;
						me.sys_id 						  = orig_sys_id;
						me.last_signatur_id 			  = orig_last_sig;
						original_bpd.url 						= me.bpd.url;
						original_upd.availible_tan_verfahren[0] = neu_sig_method;
					}
					
					if(has_neu_url){
						if(step==1){
							// Im Step 1 ist das eingeplant, dass sich die URL ändert
							me.log.conest.debug({step:2},"Start Connection in Step 2");
							perform_step(2);
						}else{
							// Wir unterstützen keine mehrfach Ändernden URLs
							if(step==3){
								me.bpd = original_bpd.clone();
								me.upd = original_upd.clone();
								me.MsgCheckAndEndDialog(recvMsg,function(error2,recvMsg2){if(error2){me.log.conest.error({step:step,error:error2},"Connection close failed.");}else{me.log.conest.debug({step:step},"Connection closed okay.");}});
							}
							me.log.conest.error({step:step},"Multiple URL changes are not supported!");
							// Callback
							try{
								cb("Mehrfachänderung der URL ist nicht unterstützt!");
							}catch(cb_error){
								me.log.conest.error(cb_error,{step:step},"Unhandled callback Error in EstablishConnection");
							}
						}
					}else if(step==1||step==2){
						// 3: eigentliche Verbindung aufbauen
						me.log.conest.debug({step:3},"Start Connection in Step 3");
						perform_step(3);
					}else{
						// Ende Schritt 3 = Verbindung Ready
						me.log.conest.debug({step:step},"Connection entirely established. Now get the available accounts.");
						// 4. Bekomme noch mehr Details zu den Konten über HKSPA
						me.MsgRequestSepa(null,function(error,recvMsg2,sepa_list){
							if(error){
								me.log.conest.error({step:step},"Error getting the available accounts.");
								me.MsgCheckAndEndDialog(recvMsg,function(error3,recvMsg2){if(error3){me.log.conest.error({step:step,error:error2},"Connection close failed.");}else{me.log.conest.debug({step:step},"Connection closed okay.");}});
								// Callback
								try{
									cb(error);
								}catch(cb_error){
									me.log.conest.error(cb_error,{step:step},"Unhandled callback Error in EstablishConnection");
								}
							}else{
								// Erfolgreich die Kontendaten geladen, diese jetzt noch in konto mergen und Fertig!
								for(var i=0;i!=sepa_list.length;i++){
									for(var j=0;j!=me.konten.length;j++){
										if(me.konten[j].konto_nr	== sepa_list[i].konto_nr&&
										   me.konten[j].unter_konto == sepa_list[i].unter_konto ){
										  me.konten[j].sepa_data = sepa_list[i];
										  break; 	
										}
									}
								}
								// Fertig
								me.log.conest.debug({step:step,recv_sepa_list:sepa_list},"Connection entirely established and got available accounts. Return.");
								// Callback
								try{
									cb(null);
								}catch(cb_error){
									me.log.conest.error(cb_error,{step:step},"Unhandled callback Error in EstablishConnection");
								}
							}
						});
					}
				}	
			});
		};
		me.log.conest.debug({step:1},"Start First Connection");
		perform_step(1);
	};
	
	// 
    me.SendMsgToDestination = function(msg,callback){// Parameter für den Callback sind error,data
		var txt = msg.transformForSend();
		me.debugLogMsg(txt,true);
		var post_data = new Buffer(txt).toString("base64");
		var u = url.parse(me.bpd.url);
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
		var prot = u.protocol=="http:"?http:https;
		me.log.con.debug({host:u.hostname,port:u.port,path:u.path},"Connect to Host");
		var req = prot.request(options, function(res) {//https.request(options, function(res) {
		  res.on('data', function (chunk) {
			data += chunk;
		  });
		  res.on('end', function(){
			// Hir wird dann weiter gemacht :)
			me.log.con.debug({host:u.hostname,port:u.port,path:u.path},"Request finished");
			var clear_txt = encoding.convert(new Buffer(data, 'base64'), 'UTF-8', 'ISO-8859-1').toString('utf8'); // TODO: this only applies for HBCI? can we dynamically figure out the charset?

			me.debugLogMsg(clear_txt,false);
			try{
				var MsgRecv = new Nachricht(me.proto_version);
				MsgRecv.parse(clear_txt);
				callback(null,MsgRecv);
			}catch(e){
				me.log.con.error(e,"Could not parse received Message");
				callback(e.toString(),null);
			}
		  });
		});
		
		req.on('error', function(){
			// Hier wird dann weiter gemacht :)
			me.log.con.error({host:u.hostname,port:u.port,path:u.path},"Could not connect to "+options.hostname);
			callback(new Exceptions.ConnectionFailedException(u.hostname,u.port,u.path),null);
		  });
		req.write(post_data);
		req.end();
    };
    
	me.debugLogMsg = function(txt,send){
		me.log.con.trace({raw_data:txt,send_or_recv:send?"send":"recv"},"Connection Data Trace");
		if(me.debug_mode)
			console.log((send?"Send: ":"Recv: ")+txt);
	};
	
};

module.exports = FinTSClient;
