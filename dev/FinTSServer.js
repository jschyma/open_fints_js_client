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
// Dieser FinTS 3.0 Server ist nur für Testzwecke und gibt daher auch nur Dummy Daten zurück
// der Funktionsumfang ist deutlich beschränkt und dient Primär des Tests des FinTSJSClients
"use strict";
var classes = require("../lib/Classes.js");
var NULL        = classes.NULL;
var Nachricht   = classes.Nachricht;
var Helper      = classes.Helper;
var DatenElementGruppe = classes.DatenElementGruppe;
var fs = require('fs');

module.exports = function(){
    var me             = this;
	me.next_dialog_nr = 10000000;
    me.my_blz         = 12345678;
    me.dialog_array   = new Object();
    me.user_db		   = {"test1":{'u':"test1",'pin':'1234'}};
    me.dbg_log_nr	= 1;
	me.my_url		= "http://localhost:3000/cgi-bin/hbciservlet";
	me.my_host		= "localhost:3000";
	me.my_debug_log = true;
	me.proto_version = 300;
	me.hikas_2_mode = false;
    
    me.handleIncomeMessage = function(txt){
        var s = new Buffer(txt, 'base64').toString('utf8');
		if(me.my_debug_log)
			console.log("Incoming: \t"+s);
		// Debug save incoming
		fs.appendFileSync("log_send_msg.txt","Neue Msg Nr: "+me.dbg_log_nr+"\n\r"+s+"\n\r\n\r");
		me.dbg_log_nr++;
		// End Debug
		var recvMsg = new Nachricht(me.proto_version);
		try{
			recvMsg.parse(s);
			var sendtxt = null;
			var sendMsg = null;
			// 1. Schauen ob schon exitierender Dialog
			var dialog_obj = me.getDialogFromMsg(recvMsg);
			if(dialog_obj===null){
				// Initialisierung
				var r=me.handleDialogInit(recvMsg);
				if(r.e){
					sendMsg = r.msg;
					sendtxt = "ERROR";
				}else{
					dialog_obj = r.dia_obj;
					sendMsg    = r.msg;
				}
			}else{
				// Normale nachricht
				sendMsg = me.createSendMsg(recvMsg,dialog_obj);
				// Signatur prüfen
	    		if(!me.checkSignature(recvMsg,dialog_obj)){
	    			sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, [[9800,NULL,"Dialog abgebrochen!"]]));
	    			sendMsg.addSeg(Helper.newSegFromArrayWithBez("HIRMS", 2,recvMsg.selectSegByName("HNSHA")[0].nr, [[9340,NULL,"Pin falsch"]]));
	    			sendtxt = "ERROR";
	    		}else{
	    			// alles okay	
	    		}
			}
			// 2. weiter bearbeiten
			if(sendtxt===null){
				var ctrl = {
					'gmsg':{},
					'msgs':[],
					'content':[]
				};
				for(var i=1;i!=recvMsg.segments.length-1;i++){
					if(recvMsg.segments[i].name=="HNHBK"||
					   recvMsg.segments[i].name=="HNHBS"||
					   recvMsg.segments[i].name=="HNSHA"||
					   recvMsg.segments[i].name=="HNSHK"){
					   	// nichts tun
					}else if(recvMsg.segments[i].name=="HKIDN"){
						if(!me.handleHKIDN(recvMsg.segments[i],ctrl,dialog_obj))
							break;
					}else if(recvMsg.segments[i].name=="HKVVB"){
						if(!me.handleHKVVB(recvMsg.segments[i],ctrl,dialog_obj))
							break;
					}else if(recvMsg.segments[i].name=="HKSYN"){
						if(!me.handleHKSYN(recvMsg.segments[i],ctrl,dialog_obj))
							break;
					}else if(recvMsg.segments[i].name=="HKEND"){
						if(!me.handleHKEND(recvMsg.segments[i],ctrl,dialog_obj))
							break;
					}else if(recvMsg.segments[i].name=="HKSPA"){
						if(!me.handleHKSPA(recvMsg.segments[i],ctrl,dialog_obj))
							break;
					}else if(recvMsg.segments[i].name=="HKKAZ"){
						if(!me.handleHKKAZ(recvMsg.segments[i],ctrl,dialog_obj))
							break;
					}
				}
				// Nachricht zusammenbauen
				
					var gmsg_array = [];
					for(var k in ctrl.gmsg){
						gmsg_array.push(ctrl.gmsg[k]);
					}
				if(gmsg_array.length>0) {
					sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, gmsg_array));
					/*case 0:sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, [["0010",NULL,"Entgegengenommen !"]]));break;
					case 1:sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, [[3060,NULL,"Bitte beachten Sie die enthaltenen Warnungen/Hinweise"]]));break;
					case 2:sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, [[9010,NULL,"Verarbeitung nicht moglich"]]));break;
					case 3:sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, [[9800,NULL,"Dialog abgebrochen!"]]));break;*/
				}
				for(var i=0;i!=ctrl.msgs.length;i++){
					sendMsg.addSeg(ctrl.msgs[i]);
				}
				for(var i=0;i!=ctrl.content.length;i++){
					sendMsg.addSeg(ctrl.content[i]);
				}
			}
			sendtxt = sendMsg.transformForSend();
			if(me.my_debug_log)
				console.log("Send: \t"+sendtxt);
			return new Buffer(sendtxt).toString("base64");
		}catch(e){
				console.log("ErrorIn:\t"+e.toString()+"stack:"+e.stack);
				return new Buffer("error").toString("base64");
		}
    };
    
    me.getDialogFromMsg = function(recvMsg){
    	var id=recvMsg.selectSegByName("HNHBK")[0].getEl(3);
    	if(id=="0"){
    		return null;
    	}else{
    		var obj = me.dialog_array[id];
    		if(obj===undefined)throw new Error("Diese Dialog ID existiert nicht!");
    		return obj;
    	}
    };
    
    me.checkSignature = function(recvMsg,dialog_obj){
    	if(recvMsg.isSigned()){
    		var HNSHK = recvMsg.selectSegByName("HNSHK")[0];
    		var HNSHA = recvMsg.selectSegByName("HNSHA")[0];
    		if(HNSHK.getEl(1).getEl(1)!="PIN")
    			return false;// andere als PIN unterstützen wir nicht
    		var pin = "";
    		try{pin=HNSHA.getEl(3).getEl(1);}catch(e){pin=HNSHA.getEl(3);}
    		return me.user_db[dialog_obj.user].pin==pin;
    	}else{
    		return true;
    	}	
    };
    
    me.createSendMsg = function(recvMsg,dialog_obj){
    	var sendMsg = new Nachricht();
    	if(recvMsg.isSigned())sendMsg.sign({'pin':"",'tan':null,'sys_id':dialog_obj.user_sys_id,'server':true,'pin_vers':'999','sig_id':0});
    	var nachrichten_nr = recvMsg.selectSegByName("HNHBK")[0].getEl(4);
    	sendMsg.init(dialog_obj.dialog_nr, nachrichten_nr ,me.my_blz,dialog_obj.user);
    	var bezugs_deg = new DatenElementGruppe();
    	bezugs_deg.addDE(dialog_obj.dialog_nr);
    	bezugs_deg.addDE(nachrichten_nr);
    	sendMsg.selectSegByName("HNHBK")[0].store.addDEG(bezugs_deg);	
    	return sendMsg;
    };
    
    me.handleDialogInit = function(recvMsg){
    	// Dialog Initialisierung
    	var dialog_nr = "DIA_"+(me.next_dialog_nr++);
    	me.dialog_array[dialog_nr]={
    		"dialog_nr":dialog_nr,
    		"user":"",
    		"user_sys_id":"0",
    		"client_name":""
    	};
    	var dialog_obj = me.dialog_array[dialog_nr];
    	var HKIDN = recvMsg.selectSegByName("HKIDN")[0];
    	dialog_obj.user 		= HKIDN.getEl(2);
    	dialog_obj.user_sys_id	= HKIDN.getEl(3);
    	var HKVVB = recvMsg.selectSegByName("HKVVB")[0];
    	// RC = 3050 BPD nicht mehr aktuell. Aktuelle Version folgt
    	dialog_obj.client_name = HKVVB.getEl(5);
    	
    	// 0. Send Msg erstellen
    	var sendMsg = me.createSendMsg(recvMsg,dialog_obj);
    	// 1. System ID setzen
    	if(dialog_obj.user_sys_id=="0"){
    		dialog_obj.user_sys_id = "USER_SYS_ID";
    	}
    	var error = false;
    	var resp_to_seg = null;
    	// 2. prüfen ob User existiert
    	if(me.user_db[dialog_obj.user]===undefined){
    		// Error Code 9210 User unbekannt
    		resp_to_seg = Helper.newSegFromArrayWithBez("HIRMS", 2,HKIDN.nr, [[9010,NULL,"User unbekannt"]]);
    		error = true;
    	}else{
    		// Signatur prüfen
    		if(!me.checkSignature(recvMsg,dialog_obj)){
    			resp_to_seg = Helper.newSegFromArrayWithBez("HIRMS", 2,recvMsg.selectSegByName("HNSHA")[0].nr, [[9340,NULL,"Pin falsch"]]);
    			error = true;
    		}
    	}
    	if(error){
    		// Fehler hier Fehler nachrichten zurück schicken
    		sendMsg.addSeg(Helper.newSegFromArray("HIRMG", 2, [[9800,NULL,"Dialog abgebrochen!"]]));
    		sendMsg.addSeg(resp_to_seg);
    		return {"e":true,"msg":sendMsg};
    	}else{
    		// Bisher kein Fehler aufgetreten
    		return {"e":false,"msg":sendMsg,"dia_obj":dialog_obj};
    	}
    };
    me.handleHKIDN = function(segment,ctrl,dialog_obj){
    	var bez = segment.nr;
    	return true;
    };
    me.handleHKVVB = function(segment,ctrl,dialog_obj){
    	var bpd_vers = segment.getEl(1);
    	var upd_vers = segment.getEl(2);
    	var bez = segment.nr;
    	ctrl.gmsg["3060"]=["3060","","Bitte beachten Sie die enthaltenen Warnungen/Hinweise"];
    	var msg_array = [];
		if(bpd_vers!="78"){
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIBPA', 3,bez,["78",["280",me.my_blz],"FinTSJSClient Test Bank","1","1","300","500"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKOM', 4,bez,[["280",me.my_blz],"1",["3",Helper.convertJSTextTo(me.my_url)],["2",Helper.convertJSTextTo(me.my_host)]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HISHV' , 3,bez,["J",["RDH","3"],["PIN","1"],["RDH","9"],["RDH","10"],["RDH","7"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIEKAS', 5,bez,["1","1","1",["J","J","N","3"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZS', 4,bez,["1","1",["365","J"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZS', 5,bez,["1","1",["365","J","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZS', 6,bez,["1","1","1",["365","J","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZS', 7,bez,["1","1","1",["365","J","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIPPDS', 1,bez,["1","1","1",["1","Telekom","prepaid","N","","","15;30;50","2","Vodafone","prepaid","N","","","15;25;50","3","E-Plus","prepaid","N","","","15;20;30","4","O2","prepaid","N","","","15;20;30","5","Congstar","prepaid","N","","","15;30;50","6","Blau","prepaid","N","","","15;20;30"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIPAES', 1,bez,["1","1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIPROS', 3,bez,["1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIPSPS', 1,bez,["1","1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIQTGS', 1,bez,["1","1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HISALS', 4,bez,["1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HISALS', 7,bez,["1","1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HISLAS', 4,bez,["1","1",["500","14","04","05"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICSBS', 1,bez,["1","1","1",["N","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICSLS', 1,bez,["1","1","1","J"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICSES', 1,bez,["1","1","1",["1","400"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HISUBS', 4,bez,["1","1",["500","14","51","53","54","56","67","68","69"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HITUAS', 2,bez,["1","1",["1","400","14","51","53","54","56","67","68","69"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HITUBS', 1,bez,["1","1","J"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HITUES', 2,bez,["1","1",["1","400","14","51","53","54","56","67","68","69"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HITULS', 1,bez,["1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICCSS', 1,bez,["1","1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HISPAS', 1,bez,["1","1","1",["J","J","N","sepade?:xsd?:pain.001.001.02.xsd","sepade?:xsd?:pain.001.002.02.xsd","sepade?:xsd?:pain.001.002.03.xsd","sepade?:xsd?:pain.001.003.03.xsd","sepade?:xsd?:pain.008.002.02.xsd","sepade?:xsd?:pain.008.003.02.xsd"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICCMS', 1,bez,["1","1","1",["500","N","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIDSES', 1,bez,["1","1","1",["3","45","6","45"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIBSES', 1,bez,["1","1","1",["2","45","2","45"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIDMES', 1,bez,["1","1","1",["3","45","6","45","500","N","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIBMES', 1,bez,["1","1","1",["2","45","2","45","500","N","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIUEBS', 3,bez,["1","1",["14","51","53","54","56","67","68","69"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIUMBS', 1,bez,["1","1",["14","51"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICDBS', 1,bez,["1","1","1","N"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICDLS', 1,bez,["1","1","1",["0","0","N","J"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIPPDS', 2,bez,["1","1","1",["1","Telekom","prepaid","N","","","15;30;50","2","Vodafone","prepaid","N","","","15;25;50","3","E-plus","prepaid","N","","","15;20;30","4","O2","prepaid","N","","","15;20;30","5","Congstar","prepaid","N","","","15;30;50","6","Blau","prepaid","N","","","15;20;30"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICDNS', 1,bez,["1","1","1",["0","1","3650","J","J","J","J","N","J","J","J","J","0000","0000"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIDSBS', 1,bez,["1","1","1",["N","N","9999"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICUBS', 1,bez,["1","1","1","N"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICUMS', 1,bez,["1","1","1","OTHR"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HICDES', 1,bez,["1","1","1",["4","1","3650","000","0000"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIDSWS', 1,bez,["1","1","1","J"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIDMCS', 1,bez,["1","1","1",["500","N","N","2","45","2","45","","sepade?:xsd?:pain.008.003.02.xsd"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIDSCS', 1,bez,["1","1","1",["2","45","2","45","","sepade?:xsd?:pain.008.003.02.xsd"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIECAS', 1,bez,["1","1","1",["J","N","N","urn?:iso?:std?:iso?:20022?:tech?:xsd?:camt.053.001.02"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('GIVPUS', 1,bez,["1","1","1","N"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('GIVPDS', 1,bez,["1","1","1","1"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HITANS', 5,bez,["1","1","1",["J","N","0","942","2","MTAN2","mobileTAN","","mobile TAN","6","1","SMS","2048","1","J","1","0","N","0","2","N","J","00","1","1","962","2","HHD1.4","HHD","1.4","Smart-TAN plus manuell","6","1","Challenge","2048","1","J","1","0","N","0","2","N","J","00","1","1","972","2","HHD1.4OPT","HHDOPT1","1.4","Smart-TAN plus optisch","6","1","Challenge","2048","1","J","1","0","N","0","2","N","J","00","1","1"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIPINS', 1,bez,["1","1","1",["5","20","6","Benutzer ID","","HKSPA","N","HKKAZ","N","HKKAZ","N","HKSAL","N","HKSLA","J","HKSUB","J","HKTUA","J","HKTUB","N","HKTUE","J","HKTUL","J","HKUEB","J","HKUMB","J","HKPRO","N","HKEKA","N","HKKAZ","N","HKKAZ","N","HKPPD","J","HKPAE","J","HKPSP","N","HKQTG","N","HKSAL","N","HKCSB","N","HKCSL","J","HKCSE","J","HKCCS","J","HKCCM","J","HKDSE","J","HKBSE","J","HKDME","J","HKBME","J","HKCDB","N","HKCDL","J","HKPPD","J","HKCDN","J","HKDSB","N","HKCUB","N","HKCUM","J","HKCDE","J","HKDSW","J","HKDMC","J","HKDSC","J","HKECA","N","GKVPU","N","GKVPD","N","HKTAN","N","HKTAN","N"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIAZSS', 1,bez,["1","1","1",["1","N","","","","","","","","","","","HKTUA;2;0;1;811","HKDSC;1;0;1;811","HKPPD;2;0;1;811","HKDSE;1;0;1;811","HKSLA;4;0;1;811","HKTUE;2;0;1;811","HKSUB;4;0;1;811","HKCDL;1;0;1;811","HKCDB;1;0;1;811","HKKAZ;6;0;1;811","HKCSE;1;0;1;811","HKSAL;4;0;1;811","HKQTG;1;0;1;811","GKVPU;1;0;1;811","HKUMB;1;0;1;811","HKECA;1;0;1;811","HKDMC;1;0;1;811","HKDME;1;0;1;811","HKSAL;7;0;1;811","HKSPA;1;0;1;811","HKEKA;5;0;1;811","HKKAZ;4;0;1;811","HKPSP;1;0;1;811","HKKAZ;5;0;1;811","HKCSL;1;0;1;811","HKCDN;1;0;1;811","HKTUL;1;0;1;811","HKPPD;1;0;1;811","HKPAE;1;0;1;811","HKCCM;1;0;1;811","HKIDN;2;0;1;811","HKDSW;1;0;1;811","HKCUM;1;0;1;811","HKPRO;3;0;1;811","GKVPD;1;0;1;811","HKCDE;1;0;1;811","HKBSE;1;0;1;811","HKCSB;1;0;1;811","HKCCS;1;0;1;811","HKDSB;1;0;1;811","HKBME;1;0;1;811","HKCUB;1;0;1;811","HKUEB;3;0;1;811","HKTUB;1;0;1;811","HKKAZ;7;0;1;811"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIVISS', 1,bez,["1","1","1",["1;;;;"]]));
		
			msg_array.push(["3050","","BPD nicht mehr aktuell, aktuelle Version enthalten."]);
		}
		if(upd_vers!="3"){
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIUPA', 4,bez,[dialog_obj.user,"2","3"]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIUPD', 6,bez,[["1","","280",me.my_blz],"DE111234567800000001",dialog_obj.user,"","EUR","Fullname","","Girokonto","",["HKSAK","1"],["HKISA","1"],["HKSSP","1"],["HKSAL","1"],["HKKAZ","1"],["HKEKA","1"],["HKCDB","1"],["HKPSP","1"],["HKCSL","1"],["HKCDL","1"],["HKPAE","1"],["HKPPD","1"],["HKCDN","1"],["HKCSB","1"],["HKCUB","1"],["HKQTG","1"],["HKSPA","1"],["HKDSB","1"],["HKCCM","1"],["HKCUM","1"],["HKCCS","1"],["HKCDE","1"],["HKCSE","1"],["HKDSW","1"],["HKPRO","1"],["HKSAL","1"],["HKKAZ","1"],["HKTUL","1"],["HKTUB","1"],["HKPRO","1"],["GKVPU","1"],["GKVPD","1"]]));
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIUPD', 6,bez,[["2","","280",me.my_blz],"DE111234567800000002",dialog_obj.user,"","EUR","Fullname","","Tagesgeld","",["HKSAK","1"],["HKISA","1"],["HKSSP","1"],["HKSAL","1"],["HKKAZ","1"],["HKEKA","1"],["HKPSP","1"],["HKCSL","1"],["HKPAE","1"],["HKCSB","1"],["HKCUB","1"],["HKQTG","1"],["HKSPA","1"],["HKCUM","1"],["HKCCS","1"],["HKCSE","1"],["HKPRO","1"],["HKSAL","1"],["HKKAZ","1"],["HKTUL","1"],["HKTUB","1"],["HKPRO","1"],["GKVPU","1"],["GKVPD","1"]]));
			msg_array.push(["3050","","UPD nicht mehr aktuell, aktuelle Version enthalten."]);
			msg_array.push(["3920","","Zugelassene TAN-Verfahren fur den Benutzer","942"]);
		}
		msg_array.push(["0901","","*PIN gultig."]);
		msg_array.push(["0020","","*Dialoginitialisierung erfolgreich"]);
		ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,msg_array));
    	return true;
    };
    me.handleHKSYN = function(segment,ctrl,dialog_obj){
    	var bez = segment.nr;
    	ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,[["0020","","Auftrag ausgefuhrt."]]));
    	ctrl.content.push(Helper.newSegFromArrayWithBez('HISYN', 4,bez,["DDDA10000000000000000000000A"]));
   
    	return true;
    };
    
    me.handleHKEND = function(segment,ctrl,dialog_obj){
    	var bez = segment.nr;
    	ctrl.gmsg["0010"]=["0010","","Nachricht entgegengenommen."];
    	ctrl.gmsg["0100"]=["0100","","Dialog beendet."];
    	return true;
    };
    me.handleHKSPA = function(segment,ctrl,dialog_obj){
    	var bez = segment.nr;
    	ctrl.gmsg["0010"]=["0010","","Nachricht entgegengenommen."];
    	ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,[["0020","","Auftrag ausgefuehrt"]]));
		ctrl.content.push(Helper.newSegFromArrayWithBez('HISPA', 1,bez,[["J","DE111234567800000001","GENODE00TES","1","","280","12345678"],["J","DE111234567800000002","GENODE00TES","2","","280","12345678"]]));
    	return true;
    };
	me.handleHKKAZ = function(segment,ctrl,dialog_obj){
		var atOnceMode = function(){
			var bez = segment.nr;
			ctrl.gmsg["0010"]=["0010","","Nachricht entgegengenommen."];
			ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,[["0020","","*Umsatzbereitstellung erfolgreich"]]));
			var mt_490 = "";
			mt_490	+=	"\r\n-\r\n";
			mt_490	+=	":20:STARTUMS\r\n";
			mt_490	+=	":25:12345678/0000000001\r\n";
			mt_490	+=	":28C:0\r\n";
			mt_490	+=	":60F:C150101EUR1041,23\r\n";
			mt_490	+=	":61:150101C182,34NMSCNONREF\r\n";
			mt_490	+=	":86:051?00UEBERWEISG?10931?20Ihre Kontonummer 0000001234\r\n";
			mt_490	+=	"?21/Test Ueberweisung 1?22n WS EREF: 1100011011 IBAN:\r\n";
			mt_490	+=	"?23 DE1100000100000001234 BIC?24: GENODE11 ?1011010100\r\n";
			mt_490	+=	"?31?32Bank\r\n";
			mt_490	+=	":62F:C150101EUR1223,57\r\n";
			mt_490	+=	"-\r\n";
			mt_490	+=	":20:STARTUMS\r\n";
			mt_490	+=	":25:12345678/0000000001\r\n";
			mt_490	+=	":28C:0\r\n";
			mt_490	+=	":60F:C150301EUR1223,57\r\n";
			mt_490	+=	":61:150301C100,03NMSCNONREF\r\n";
			mt_490	+=	":86:051?00UEBERWEISG?10931?20Ihre Kontonummer 0000001234\r\n";
			mt_490	+=	"?21/Test Ueberweisung 2?22n WS EREF: 1100011011 IBAN:\r\n";
			mt_490	+=	"?23 DE1100000100000001234 BIC?24: GENODE11 ?1011010100\r\n";
			mt_490	+=	"?31?32Bank\r\n";
			mt_490	+=	":61:150301C100,00NMSCNONREF\r\n";
			mt_490	+=	":86:051?00UEBERWEISG?10931?20Ihre Kontonummer 0000001234\r\n";
			mt_490	+=	"?21/Test Ueberweisung 3?22n WS EREF: 1100011011 IBAN:\r\n";
			mt_490	+=	"?23 DE1100000100000001234 BIC?24: GENODE11 ?1011010100\r\n";
			mt_490	+=	"?31?32Bank\r\n";
			mt_490	+=	":62F:C150101EUR1423,60\r\n";
			mt_490	+=	"-\r\n";
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZ',7,bez,[Helper.Byte(mt_490)]));
		};
		var first = function(){
			var bez = segment.nr;
			ctrl.gmsg["0010"]=["0010","","Nachricht entgegengenommen."];
			ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,[["3040","","Auftrag nur teilweise ausgefuhrt","my_cont_id"]]));
			var mt_490 = "";
			mt_490	+=	"\r\n-\r\n";
			mt_490	+=	":20:STARTUMS\r\n";
			mt_490	+=	":25:12345678/0000000001\r\n";
			mt_490	+=	":28C:0\r\n";
			mt_490	+=	":60F:C150101EUR1041,23\r\n";
			mt_490	+=	":61:150101C182,34NMSCNONREF\r\n";
			mt_490	+=	":86:051?00UEBERWEISG?10931?20Ihre Kontonummer 0000001234\r\n";
			mt_490	+=	"?21/Test Ueberweisung 1?22n WS EREF: 1100011011 IBAN:\r\n";
			mt_490	+=	"?23 DE1100000100000001234 BIC?24: GENODE11 ?1011010100\r\n";
			mt_490	+=	"?31?32Bank\r\n";
			mt_490	+=	":62F:C150101EUR1223,57\r\n";
			mt_490	+=	"-\r\n";
			mt_490	+=	":20:STARTUMS\r\n";
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZ',7,bez,[Helper.Byte(mt_490)]));
		};
		var second = function(){
			var bez = segment.nr;
			ctrl.gmsg["0010"]=["0010","","Nachricht entgegengenommen."];
			ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,[["0020","","*Umsatzbereitstellung erfolgreich"]]));
			var mt_490 = "";
			mt_490	+=	":25:12345678/0000000001\r\n";
			mt_490	+=	":28C:0\r\n";
			mt_490	+=	":60F:C150301EUR1223,57\r\n";
			mt_490	+=	":61:150301C100,03NMSCNONREF\r\n";
			mt_490	+=	":86:051?00UEBERWEISG?10931?20Ihre Kontonummer 0000001234\r\n";
			mt_490	+=	"?21/Test Ueberweisung 2?22n WS EREF: 1100011011 IBAN:\r\n";
			mt_490	+=	"?23 DE1100000100000001234 BIC?24: GENODE11 ?1011010100\r\n";
			mt_490	+=	"?31?32Bank\r\n";
			mt_490	+=	":61:150301C100,00NMSCNONREF\r\n";
			mt_490	+=	":86:051?00UEBERWEISG?10931?20Ihre Kontonummer 0000001234\r\n";
			mt_490	+=	"?21/Test Ueberweisung 3?22n WS EREF: 1100011011 IBAN:\r\n";
			mt_490	+=	"?23 DE1100000100000001234 BIC?24: GENODE11 ?1011010100\r\n";
			mt_490	+=	"?31?32Bank\r\n";
			mt_490	+=	":62F:C150101EUR1423,60\r\n";
			mt_490	+=	"-\r\n";
			ctrl.content.push(Helper.newSegFromArrayWithBez('HIKAZ',7,bez,[Helper.Byte(mt_490)]));
		};
		var hikas_2_mode = me.hikas_2_mode;
		if(!hikas_2_mode){
			atOnceMode();
		}else{
			var e = false;
			if(segment.store.data.length>=6){
				if(segment.getEl(6)=="my_cont_id"){
					second();
				}else{
					var bez = segment.nr;
					ctrl.gmsg["9050"]=["9050","","Teilweise fehlerhaft "];
					ctrl.msgs.push(Helper.newSegFromArrayWithBez('HIRMS', 2,bez,[["9210","","Aufsetzpunkt unbekannt."]]));
				}
			}else{
				first();
			}
		}
		return true;
	};
};