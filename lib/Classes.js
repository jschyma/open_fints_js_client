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
var p_classes = require("./Parser.js");
var Parser = p_classes.Parser;
var ParseError = p_classes.ParseError;
var Konto = function(){
		var me_konto = this;
		me_konto.iban = "";
		me_konto.konto_nr ="";
		me_konto.unter_konto_merkm = null;
		me_konto.ctry_code = "";
		me_konto.blz = "";
		me_konto.kunden_id = "";
		me_konto.kontoart = "";
		me_konto.currency = "";
		me_konto.kunde1_name = "";
		me_konto.product_name = "";
	};
var NULL = new function(){
	this.id = 1234;
};

var ByteVal = function(ddd){
    this.data =  ddd;
};

var Helper = new function () {
            this.checkMsgsWithBelongToForId = function(msg,bez,id){
                var array = msg.selectSegByNameAndBelongTo("HIRMS",bez);
                if(array.length>0){
                    for(var i=0;i!=array.length;i++){
                        for(var a=0;a!=array[i].store.data.length;a++){
                            var d= array[i].store.data[a];
                            if(d.getEl(1)==id){
                                return d;
                            }
                        }
                    }
                    return null;
                }else{
                    return null;
                }
                
            }
            this.getNrWithLeadingNulls = function (nr, len) {
                var stxt = nr + "";
                var ltxt = "";
                var neu = len - stxt.length;
                for (var i = 0; i != neu; i++) {
                    ltxt += "0";
                }
                ltxt += stxt;
                return ltxt;
            };
            this.newSegFromArrayWithBez = function (name, vers,bez, ar) {
                var seg = this.newSegFromArray(name,vers,ar);
                seg.bez = bez;
                return seg;
            }
            this.newSegFromArray = function (name, vers, ar) {
                var seg = new Segment();
                seg.init(name, 0, vers, 0);
                for (var i = 0; i != ar.length; i++) {
                    if (ar[i] instanceof Array) {
                        var neu = new DatenElementGruppe();
                        for (var j = 0; j != ar[i].length; j++) {
                            if(ar[i][j] instanceof ByteVal){
        				        neu.addDEbin(ar[i][j].data);
        				    }else{
                                neu.addDE(ar[i][j]);
        				    }
                        }
                        seg.store.addDEG(neu);
                    } else if(ar[i] instanceof ByteVal){
				        seg.store.addDEbin(ar[i].data);
				    }else {
                        // normales datenelement
                        seg.store.addDE(ar[i]);
                    }
                }
                return seg;
            };
            this.convertIntoArray = function(de_or_deg){
              if(de_or_deg instanceof DatenElementGruppe){
                var r=[];
                for(var i=0;i!=de_or_deg.data.length;i++){
                    r.push(de_or_deg.data[i]);
                }  
                return r;
              }else{
                return [de_or_deg];  
              }
            };
			this.convertDateToDFormat = function(date){
				var yyyy = date.getFullYear()+"";
				var mm   = ((date.getMonth()+1)<=9)?("0"+(date.getMonth()+1)):((date.getMonth()+1)+"");
				var dd   = (date.getDate()<=9)?("0"+date.getDate()):(date.getDate()+"");
				return yyyy+mm+dd;
			};
			this.convertDateToTFormat = function(date){
				var hh = ((date.getHours()<=9)?"0":"")+date.getHours();
				var mm = ((date.getMinutes()<=9)?"0":"")+date.getMinutes();
				var ss = ((date.getSeconds()<=9)?"0":"")+date.getSeconds();
				return hh+mm+ss;
			};
			this.convertFromToJSText = function(ftxt){
				var jstxt = "";
				var re = /\?([^\?])/g;
				jstxt = ftxt.replace(re,"$1");
				return jstxt;
			};
			this.convertJSTextTo = function(jstxt){
				var ftxt = "";
				var re = /([:\+\?'\@])/g;
				ftxt = jstxt.replace(re,"?$&");
				return ftxt;
			};
			this.Byte = function(data){
			    return new ByteVal(data);
			};
        };

var DatenElementGruppe = function () {
        var me_deg = this;
        me_deg.next_el = 0;
        me_deg.data = new Array();
        me_deg.desc = new Array();
        me_deg.addDE = function (val) {
            me_deg.data[me_deg.next_el] = val;
            me_deg.desc[me_deg.next_el] = 1;
            me_deg.next_el++;
        };
        me_deg.addDEbin = function (val) {
            me_deg.data[me_deg.next_el] = val;
            me_deg.desc[me_deg.next_el] = 3;
            me_deg.next_el++;
        };
        me_deg.addDEG = function (grup) {
            me_deg.data[me_deg.next_el] = grup;
            me_deg.desc[me_deg.next_el] = 2;
            me_deg.next_el++;
        };
        me_deg.parse = function (parser) {
            var start_pos;
            var first = false;
            while (!first || (":" == parser.getCurrentChar() && parser.hasNext())) {
                if (!first) first = true;
                else parser.nextPos();
                start_pos = parser.getCurrentPos();
                parser.setMarkerWithCurrentPos("start");
                if (parser.getCurrentChar() == "@") {
                    // binary
                    parser.nextPos();
                    parser.setMarkerWithCurrentPos("start");
                    if (!parser.gotoNextValidChar("@")) throw new ParseError("Seg", "Error binary!", start_pos);
                    var len = parseInt(parser.getTextFromMarkerToCurrentPos("start"));
                    parser.nextPos();
                    parser.setMarkerWithCurrentPos("start");
                    parser.setCurrentPos(parser.getCurrentPos() + len);
                    if ("+:'".indexOf(parser.getCurrentChar()) == -1) throw new ParseError("Seg", "Error binary, Wrong Length!" + len, start_pos);
                    me_deg.addDEbin(parser.getTextFromMarkerToCurrentPos("start"));
                    parser.nextPos();
                } else if (parser.gotoNextValidCharButIgnoreWith("+:'", "?")) {
                    // Normales datenelement
                    me_deg.addDE(parser.getTextFromMarkerToCurrentPos("start"));
                    // Datengruppe können nicht bestandteil einer datengruppe sein
                } else {
                    throw new ParseError("Seg", "Unerwartetes ENDE!", start_pos);
                }
            }
        };
        me_deg.transformForSend = function () {
            var result = "";
            for (var i = 0; i != me_deg.data.length; i++) {
				if(me_deg.data[i]!=NULL){
				    if (me_deg.desc[i] == 1) {
						result += (i != 0 ? ":" : "") + me_deg.data[i]; // DE
					} else if (me_deg.desc[i] == 2) { // kommt nicht vor
						result += (i != 0 ? ":" : "") + me_deg.data[i].transformForSend(); //DEG
					} else if (me_deg.desc[i] == 3) {
						result += (i != 0 ? ":" : "") + "@" + me_deg.data[i].length + "@" + me_deg.data[i]; // BIN DAT
					}
				}else{
					// leer
					result += (i != 0 ? ":" : "");
				}
            }
            return result;
        };
		me_deg.getEl = function(i){
			return me_deg.data[i-1];
		};
    };

    var Segment = function () {


        var me_seg = this;
        me_seg.name = null;
        me_seg.nr = 0;
        me_seg.vers = 0;
        me_seg.bez = 0;
        me_seg.store = new DatenElementGruppe();

        me_seg.init = function (n, nr, ve, be) {
            me_seg.name = n;
            me_seg.nr = nr;
            me_seg.vers = ve;
            me_seg.bez = be;
        };

        me_seg.transformForSend = function () {
            var result = "";
            result += me_seg.name; // Nr. 1 Segmentkennung an ..6 M 1 
            result += ":" + me_seg.nr; // Nr. 2 Segmentnummer num ..3 M 1 >=1
            result += ":" + me_seg.vers; // Nr. 3 Segmentversion GD num ..3 M 1
            if(me_seg.bez!==0) result += ":" + me_seg.bez;
            for (var i = 0; i != me_seg.store.data.length; i++) {
                if(me_seg.store.data[i]!=NULL){
					if (me_seg.store.desc[i] == 1) {
						result += "+" + me_seg.store.data[i]; // DE
					} else if (me_seg.store.desc[i] == 2) {
						result += "+" + me_seg.store.data[i].transformForSend(); //DEG
					} else if (me_seg.store.desc[i] == 3) {
						result += "+@" + me_seg.store.data[i].length + "@" + me_seg.store.data[i]; // BIN DAT
					}
				}else{
					// leer
					result += "+";
				}
            }
            result += "'";
            return result;
        };

        me_seg.parse = function (parser) {
            var start_pos = parser.getCurrentPos();
            // 1. Segmentkopf
            // Nr. 1 Segmentkennung an ..6 M 1 
            parser.setMarkerWithCurrentPos("start");
            if (parser.gotoNextValidChar(":")) {
                me_seg.name = parser.getTextFromMarkerToCurrentPos("start");
            } else {
                throw new ParseError("Seg", "Segmentkennung Fehlt!", start_pos);
            }
            // Nr. 2 Segmentnummer num ..3 M 1 >=1
            parser.nextPos();
            start_pos = parser.getCurrentPos();
            parser.setMarkerWithCurrentPos("start");
            if (parser.gotoNextValidChar(":")) {
                me_seg.nr = parser.getTextFromMarkerToCurrentPos("start");
            } else {
                throw new ParseError("Seg", "Segmentnummer fehlt!", start_pos);
            }
            // Nr. 3 Segmentversion GD num ..3 M 1 
            parser.nextPos();
            start_pos = parser.getCurrentPos();
            parser.setMarkerWithCurrentPos("start");
            if (parser.gotoNextValidChar(":+'")) {
                me_seg.vers = parser.getTextFromMarkerToCurrentPos("start");
            } else {
                throw new ParseError("Seg", "Segmentversion fehlt!", start_pos);
            }
            // Nr. 4 Bezugssegment GD num ..3 K 1 >=1 
            if (parser.getCurrentChar() == ":") {
                parser.nextPos();
                start_pos = parser.getCurrentPos();
                parser.setMarkerWithCurrentPos("start");
                if (parser.gotoNextValidChar("+")) {
                    me_seg.bez = parser.getTextFromMarkerToCurrentPos("start");
                } else {
                    throw new ParseError("Seg", "Unerwartetes ENDE!", start_pos);
                }
            }
            // jetzt kommen datenlemente oder datenelementgruppen
            while (parser.getCurrentChar() != "'" && parser.hasNext()) {
                parser.nextPos();
                start_pos = parser.getCurrentPos();
                parser.setMarkerWithCurrentPos("start");
                if (parser.getCurrentChar() == "@") {
                    // binary
                    parser.nextPos();
                    parser.setMarkerWithCurrentPos("start");
                    if (!parser.gotoNextValidChar("@")) throw new ParseError("Seg", "Error binary!", start_pos);
                    var len = parseInt(parser.getTextFromMarkerToCurrentPos("start"));
                    parser.nextPos();
                    parser.setMarkerWithCurrentPos("start");
                    parser.setCurrentPos(parser.getCurrentPos() + len);
                    if ("+:'".indexOf(parser.getCurrentChar()) == -1) throw new ParseError("Seg", "Error binary, Wrong Length!" + len, start_pos);
                    me_seg.store.addDEbin(parser.getTextFromMarkerToCurrentPos("start"));
                } else if (parser.gotoNextValidCharButIgnoreWith("+:'", "?")) {
                    if (parser.getCurrentChar() == "+" || parser.getCurrentChar() == "'") {
                        // Normales datenelement
                        me_seg.store.addDE(parser.getTextFromMarkerToCurrentPos("start"));
                    } else {
                        // Datengruppe
                        parser.setPosBackToMarker("start");
                        var neu_deg = new DatenElementGruppe();
                        neu_deg.parse(parser);
                        me_seg.store.addDEG(neu_deg);
                    }
                } else {
                    throw new ParseError("Seg", "Unerwartetes ENDE!", start_pos);
                }
            }
        };
    
		me_seg.getEl = function(nr){
			return me_seg.store.data[nr-1];
		};
	};

    var Nachricht = function () {
        var me_msg = this;
        me_msg.segments = new Array();
        me_msg.segments_ctr = 0;
        me_msg.sign_it = null;
        me_msg.hnvsk   = null;
        me_msg.msg_nr  = 0;
        
        me_msg.sign = function(sign_obj){// sign_obj = {'pin':pin,'tan':tan,'sys_id':0}// Tan bitte null setzen wenn nicht benötigt
            me_msg.sign_it = sign_obj;
        };
        
        me_msg.init = function (dialog_id, ongoing_nr,blz,kunden_id) {
            // this is called wenn es ein outgoing message ist
            me_msg.msg_nr = ongoing_nr;
            var seg = new Segment();
            seg.init("HNHBK", 1, 3, 0);
            me_msg.addSeg(seg);
            seg.store.addDE(Helper.getNrWithLeadingNulls(0, 12)); // Länge
            seg.store.addDE("300"); // Version
            seg.store.addDE(dialog_id); //Dialog-ID, bei 0 beginnend wird von KI bekannt gegeben
            seg.store.addDE(me_msg.msg_nr); //Nachrichten-Nr. streng monoton von 1 ab steigen
            if(me_msg.sign_it){// NUr für das Pin/Tan Verfahren 1 Schritt!
				// Infos hierzu: http://www.hbci-zka.de/dokumente/spezifikation_deutsch/fintsv3/FinTS_3.0_Security_Sicherheitsverfahren_HBCI_Rel_20130718_final_version.pdf Punkt B5.1
                // http://www.hbci-zka.de/dokumente/spezifikation_deutsch/fintsv3/FinTS_3.0_Security_Sicherheitsverfahren_PINTAN_Rel_20101027_final_version.pdf B8.4
				// Sicherheitsprofil ["PIN",1] = PIN und 1 Schrittverfahren
				// Sicherheitsfunktion: 999 - 1 SChrittverfahren / 2Schritt siehe BPD
				// Sicherheitskontrollreferenz: 1 // Muss mit Signaturabschluss übereinstimmen
				// Bereich der Sicherheitsapplikation,kodiert: 1 // 1: Signaturkopf und HBCI-Nutzdaten (SHM)
				// Rolle des Sicherheitslieferanten,kodiert: 1 // 1: Der Unterzeichner ist Herausgeber der signierten Nachricht, z.B. Erfasser oder Erstsignatur (ISS)
				// Sicherheitsidentifikation, Details: [1,null,0]
				//		Bezeichner Sicherheitspartei	1		1: Message Sender (MS), wenn ein Kunde etwas an sein Kreditinstitut sendet
				//		CID nur Chipkarte				null	
				// 		Id der Partei nur Software		0		Code, welcher die (Kommunikations-)Partei identifiziert. Dieses Feld muss eine gültige, zuvor vom Banksystem angeforderte Kundensystem-ID enthalten (analog zum RSA-Verfahren). Dies gilt auch fürZweit-und Drittsignaturen.
				//			beim Erstmal noch 0, dann auf Antwort von Bank in HISYN warten und das verwenden!
				//	Sicherheitsreferenznummer: 1 Verhinderung der Doppeleinreichung Bei softwarebasierten Verfahren wird die Sicherheitsreferenznummer auf Basis des DE Kundensystem-ID und des DE Benutzerkennung der DEG Schlüsselnamen verwaltet.
				//							bei Pin/Tan kann das auch einfach bei 1 beibehalten werden :), sonst müsste man das aber eigtl. incrementieren
				// 	Sicherheitsdatum und -uhrzeit [1,"20141210","003515"], 1: Bedeutung = Sicherheitszeitstempel (STS)
				//	Hashalgorithmus: [1,999,1]
				//		Verwendung des Hashalgorithmus,kodiert	1: Owner Hashing (OHA) (nur)
				//		Hashalgorithmus,kodiert					999: Gegenseitig vereinbart (ZZZ); hier: RIPEMD-160 ( gibt noch andere Werte 1-6 vorallem SHAxxx
				// 		Bezeichner für Hashalgorithmusparameter	1: IVC (Initialization value, clear text)
				//	Signaturalgorithmus: [6,10,16]
				//		Verwendung des Signaturalgorithmus, kodiert 6: Owner Signing (OSG)
				//		10: RSA-Algorithmus (bei RAH und RDH)
				//		Operationsmodus, kodiert	16:	ISO 9796-1 (bei RDH)
				//	Schlüsselname	[280,blz,kunden_id,"S",0,0]
				//		Kreditinstitutskennung	280,blz
				//		Benutzerkennung 		kunden_id
				//		Schlüsselart			S	S: Signierschlüsse
				//		Schlüsselnummer			0
				//		Schlüsselversion		0
				var signature_id = (me_msg.sign_it.sys_id+"")=="0"?1:me_msg.sign_it.sig_id;
				me_msg.sign_it.blz = blz;
				me_msg.sign_it.kunden_id = kunden_id;
				me_msg.sign_it.server===undefined?
				    me_msg.addSeg(Helper.newSegFromArray("HNSHK", 4, [["PIN",me_msg.sign_it.pin_vers=="999"?1:2],me_msg.sign_it.pin_vers,1,1,1,[1,NULL,me_msg.sign_it.sys_id],signature_id,[1,Helper.convertDateToDFormat(new Date()),Helper.convertDateToTFormat(new Date())],[1,999,1],[6,10,16],[280,blz,kunden_id,"S",0,0]]))
                    :me_msg.addSeg(Helper.newSegFromArray("HNSHK", 4, [["PIN",me_msg.sign_it.pin_vers=="999"?1:2],me_msg.sign_it.pin_vers,1,1,1,[2,NULL,me_msg.sign_it.sys_id],signature_id,[1,Helper.convertDateToDFormat(new Date()),Helper.convertDateToTFormat(new Date())],[1,999,1],[6,10,16],[280,blz,kunden_id,"S",0,0]]));
                
            }
        };

        me_msg.parse = function (in_txt) {
            var parser = new Parser(in_txt);
            while (parser.hasNext()) {
                var segm = new Segment();
                segm.parse(parser);
                me_msg.segments.push(segm);
                parser.nextPos();
            }
            // prüfen ob verschlüsselt war
            if(me_msg.segments.length==4&&me_msg.segments[1].name == "HNVSK"&&me_msg.segments[2].name == "HNVSD"){
                var first     = me_msg.segments[0];
                me_msg.hnvsk  = me_msg.segments[1];
                var seg_hnvsd = me_msg.segments[2];
                var last      = me_msg.segments[3];
                // Neue Segmente hinzufügen
                me_msg.segments = new Array();
                me_msg.segments.push(first);
                if(me_msg.hnvsk.getEl(1).getEl(1)=="PIN"){
                    var parser2 = new Parser(seg_hnvsd.getEl(1));
                    while (parser2.hasNext()) {
                        var segm2 = new Segment();
                        segm2.parse(parser2);
                        me_msg.segments.push(segm2);
                        parser2.nextPos();
                    }
                }else{
                    throw new ParseError("Msg", "Nicht unterstützte Verschlüsselungsmethode!", 0);
                }
                me_msg.segments.push(last);
            }
        };

        me_msg.transformForSend = function () {
            var top = me_msg.segments[0].transformForSend();
            var body = "";
			// Signatur abschluss
			if(me_msg.sign_it){
				// Signaturabschluss
				// Sicherheitskontrollreferenz 1 muss mit signaturkopf übereinstimmen
				// Validierungsresultat null, bleibt bei PinTan leer
				// Benutzerdefinierte Signatur [Pin,Tan], die Tan nur dann wenn durch den Geschäftsvorfall erforderlich
				if(me_msg.sign_it.server===undefined){
				    if(me_msg.sign_it.tan===NULL){
				        me_msg.addSeg(Helper.newSegFromArray("HNSHA", 2, [1,NULL,[me_msg.sign_it.pin]]));
				    }else{
				        me_msg.addSeg(Helper.newSegFromArray("HNSHA", 2, [1,NULL,[me_msg.sign_it.pin,me_msg.sign_it.tan]]));
				    }
				}else{
				    me_msg.addSeg(Helper.newSegFromArray("HNSHA", 2, [2]));
				}
			}
            for (var i = 1; i != me_msg.segments.length; i++) {
                body += me_msg.segments[i].transformForSend();
            }
            // Letztes segment erstellen
            if(me_msg.sign_it){
                // in body ist der eigentliche body der dann aber jetzt neu erstellt wird
                // Verschlüsselung
                // 1. HNVSK                                     HNVSK:998:3
                // Sicherheitsprofil                            [PIN:1]
                // Sicherheitsfunktion, kodiert                 998 // bleibt immer so unabhängig von der der tatsächlichen Funktion
                // Rolle des Sicherheits-lieferanten, kodiert   1
                // Sicherheitsidentifikation, Details           [1.null.0]
                // Sicherheitsdatum und -uhrzeit                [1,20141216,205751]
                // Verschlüsselungs-algorithmus                 [2,2,13,@8@,5,1]
                // Schlüsselname                                [280:12345678:max:V:0:0]
                //      Ctry Code                               280 (hier fest)
                //      BLZ
                //      benutzer
                //      Schlüsselart                            V Chiffrierschlüssel
                //      Schlüsselnummer                         0
                //      Schlüsselversion                        0
                // Komprimierungsfunktion                       0
                // Zertifikat                                   leer hier
                //+998+1+1::0+1:20141216:205751+2:2:13:@8@:5:1+280:12345678:max:V:0:0+0'
                me_msg.hnvsk = Helper.newSegFromArray("HNVSK", 3, [["PIN",me_msg.sign_it.pin_vers=="999"?1:2],998,1,[1,NULL,me_msg.sign_it.sys_id],[1,Helper.convertDateToDFormat(new Date()),Helper.convertDateToTFormat(new Date())],[2,2,13,Helper.Byte("\0\0\0\0\0\0\0\0"),5,1],[280,me_msg.sign_it.blz,me_msg.sign_it.kunden_id,"V",0,0],0]);
                me_msg.hnvsk.nr = 998;
                var seg_hnvsd = Helper.newSegFromArray("HNVSD", 1, [Helper.Byte(body)]);
                seg_hnvsd.nr = 999;
                body = me_msg.hnvsk.transformForSend();
                body+= seg_hnvsd.transformForSend();
            }
            // Abschließen
            var seg = Helper.newSegFromArray("HNHBS", 1, [me_msg.msg_nr]);
            me_msg.addSeg(seg);
            body += seg.transformForSend();
            var llength = top.length + body.length;
            me_msg.segments[0].store.data[0] = Helper.getNrWithLeadingNulls(llength, 12);
            top = me_msg.segments[0].transformForSend();
            return top + body;
        };
        me_msg.addSeg = function (seg) {
            seg.nr = me_msg.segments_ctr + 1;
            me_msg.segments[me_msg.segments_ctr] = seg;
            me_msg.segments_ctr++;
			return seg.nr;
        };
    
		me_msg.isSigned = function(){
		   return   me_msg.selectSegByName("HNSHK").length==1;
		};
		
		me_msg.selectSegByName = function(name){
			var r = [];
			for(var i=0;i!=me_msg.segments.length;i++){
				if(me_msg.segments[i].name==name){
					r.push(me_msg.segments[i]);
				}
			}
			return r;
		};
		me_msg.selectSegByBelongTo = function(belong_to){
			var r = [];
			for(var i=0;i!=me_msg.segments.length;i++){
				if(me_msg.segments[i].bez==(belong_to+"")){
					r.push(me_msg.segments[i]);
				}
			}
			return r;
		};
		me_msg.selectSegByNameAndBelongTo = function(name,belong_to){
			var r = [];
			for(var i=0;i!=me_msg.segments.length;i++){
				if(me_msg.segments[i].name==name&&me_msg.segments[i].bez==(belong_to+"")){
					r.push(me_msg.segments[i]);
				}
			}
			return r;
		};
		// Nur für Debug/Entwicklungszwecke um ein JS Response aus einem echten Response zu generieren
		me_msg.create_debug_js = function(){
		    var top = "var sendMsg = new FinTSClient().testReturnMessageClass();\n\r";
		    var sig = "\n\r";
		    var body = "";
		    for(var i=0;i!=me_msg.segments.length;i++){
				if(me_msg.segments[i].name=="HNHBK"||
				   me_msg.segments[i].name=="HNHBS"||
				   me_msg.segments[i].name=="HNSHA"){
			       // auslassen
				}else if(me_msg.segments[i].name=="HNSHK"){
					// Signatur
					sig = "sendMsg.sign({'pin':'pin1234','tan':null,'sys_id':'"+me_msg.segments[i].getEl(6).getEl(3)+"'});\n\r";
				}else{
				    // generate array structure out of segment
				    var seg_array = new Array();
				    for(var a=0;a!=me_msg.segments[i].store.data.length;a++){
				        if(me_msg.segments[i].store.desc[a]==1){// DE
				            seg_array.push(me_msg.segments[i].store.data[a]);
				        }else if(me_msg.segments[i].store.desc[a]==2){//DEG
				            // DEG durchforsten
				            var deg_array = new Array();
				            for(var d=0;d!=me_msg.segments[i].store.data[a].data.length;d++){
        				        if(me_msg.segments[i].store.data[a].desc[d]==1){// DE
        				            deg_array.push(me_msg.segments[i].store.data[a].data[d]);
        				        }else if(me_msg.segments[i].store.data[a].desc[d]==2){// DEG
        				            //sollte hier garnicht auftreten
        				            throw "FEHLER DEG erhalten wo dies nicht passieren sollte";
        				        }else if(me_msg.segments[i].store.desc[a].desc[d]==3){//BINARY
        				            deg_array.push("BYTE"+me_msg.segments[i].store.data[a].data[d]);
        				        }
        				    }
        				    seg_array.push(deg_array);
				        }else if(me_msg.segments[i].store.desc[a]==3){//BINARY
				            seg_array.push("BYTE"+me_msg.segments[i].store.data[a]);
				        }
				    }
				    if(me_msg.segments[i].bez==0)
				        body += "sendMsg.addSeg(Helper.newSegFromArray('"+me_msg.segments[i].name+"', "+me_msg.segments[i].vers+", "+JSON.stringify(seg_array)+"));\n\r";
				    else
				        body += "sendMsg.addSeg(Helper.newSegFromArrayWithBez('"+me_msg.segments[i].name+"', "+me_msg.segments[i].vers+","+me_msg.segments[i].bez+","+JSON.stringify(seg_array)+"));\n\r";
				}
			}
			return top+sig+body;
		};
	};

module.exports = {};
module.exports.Helper    = Helper;
module.exports.Nachricht = Nachricht;
module.exports.Segment   = Segment;
module.exports.DatenElementGruppe = DatenElementGruppe;
module.exports.Konto     = Konto;
module.exports.ByteVal   = ByteVal;
module.exports.NULL      = NULL;