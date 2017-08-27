/*
 *  Copyright 2015-2016 Jens Schyma jeschyma@gmail.com
 *
 *  This File is a Part of the source of Open-Fin-TS-JS-Client.
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
'use strict'
var util = require('util')
var p_classes = require('./Parser.js')
var Parser = p_classes.Parser
var ParseError = p_classes.ParseError

var Konto = function () {
  var me_konto = this
  me_konto.iban = ''
  me_konto.konto_nr = ''
  me_konto.unter_konto_merkm = null
  me_konto.ctry_code = ''
  me_konto.blz = ''
  me_konto.kunden_id = ''
  me_konto.kontoart = ''
  me_konto.currency = ''
  me_konto.kunde1_name = ''
  me_konto.product_name = ''
}

var NULL = new function () {
  this.id = 1234
}()

var ByteVal = function (ddd) {
  this.data = ddd
}

var Helper = new function () {
  this.checkMsgsWithBelongToForId = function (msg, id) {
    var array = msg.selectSegByName('HIRMS')
    if (array.length > 0) {
      for (var i = 0; i != array.length; i++) {
        for (var a = 0; a != array[i].store.data.length; a++) {
          var d = array[i].store.data[a]
          if (d.getEl(1) == id) {
            return d
          }
        }
      }
      return null
    } else {
      return null
    }
  }

  this.getNrWithLeadingNulls = function (nr, len) {
    var stxt = nr + ''
    var ltxt = ''
    var neu = len - stxt.length
    for (var i = 0; i != neu; i++) {
      ltxt += '0'
    }
    ltxt += stxt
    return ltxt
  }

  this.newSegFromArrayWithBez = function (name, vers, bez, ar) {
    var seg = this.newSegFromArray(name, vers, ar)
    seg.bez = bez
    return seg
  }

  this.newSegFromArray = function (name, vers, ar) {
    var seg = new Segment()
    seg.init(name, 0, vers, 0)
    for (var i = 0; i != ar.length; i++) {
      if (ar[i] instanceof Array) {
        var neu = new DatenElementGruppe()
        for (var j = 0; j != ar[i].length; j++) {
          if (ar[i][j] instanceof ByteVal) {
            neu.addDEbin(ar[i][j].data)
          } else {
            neu.addDE(ar[i][j])
          }
        }
        seg.store.addDEG(neu)
      } else if (ar[i] instanceof ByteVal) {
        seg.store.addDEbin(ar[i].data)
      } else {
        // normales datenelement
        seg.store.addDE(ar[i])
      }
    }
    return seg
  }

  this.convertIntoArray = function (de_or_deg) {
    if (de_or_deg instanceof DatenElementGruppe) {
      var r = []
      for (var i = 0; i != de_or_deg.data.length; i++) {
        r.push(de_or_deg.data[i])
      }
      return r
    } else {
      return [de_or_deg]
    }
  }

  this.convertDateToDFormat = function (date) {
    var yyyy = date.getFullYear() + ''
    var mm = ((date.getMonth() + 1) <= 9) ? ('0' + (date.getMonth() + 1)) : ((date.getMonth() + 1) + '')
    var dd = (date.getDate() <= 9) ? ('0' + date.getDate()) : (date.getDate() + '')
    return yyyy + mm + dd
  }

  this.convertDateToTFormat = function (date) {
    var hh = ((date.getHours() <= 9) ? '0' : '') + date.getHours()
    var mm = ((date.getMinutes() <= 9) ? '0' : '') + date.getMinutes()
    var ss = ((date.getSeconds() <= 9) ? '0' : '') + date.getSeconds()
    return hh + mm + ss
  }

  this.convertFromToJSText = function (ftxt) {
    var jstxt = ''
    var re = /\?([^\?])/g
    jstxt = ftxt.replace(re, '$1')
    return jstxt
  }

  this.convertJSTextTo = function (jstxt) {
    var ftxt = ''
    var re = /([:\+\?'\@])/g
    ftxt = jstxt.replace(re, '?$&')
    return ftxt
  }

  this.Byte = function (data) {
    return new ByteVal(data)
  }

  this.getSaldo = function (seg, nr, hbci_3_vers) {
    if (seg) {
      try {
        var base = seg.getEl(nr)
        var result = {
          'soll_haben': null,
          'buchungsdatum': null,
          'currency': null,
          'value': null
        }
        result.soll_haben = base.getEl(1) == 'C' ? 'H' : 'S'
        result.currency = hbci_3_vers ? 'EUR' : base.getEl(3)
        result.value = parseFloat(base.getEl(2).replace(',', '.'))
        result.buchungsdatum = this.getJSDateFromSeg(base, hbci_3_vers ? 3 : 4, hbci_3_vers ? 4 : 5)
        return result
      } catch (ee) {
        return null
      }
    } else {
      return null
    }
  }

  this.getBetrag = function (seg, nr) {
    if (seg) {
      try {
        var base = seg.getEl(nr)
        var result = {
          'currency': null,
          'value': null
        }
        result.currency = base.getEl(2)
        result.value = parseFloat(base.getEl(1).replace(',', '.'))
        return result
      } catch (ee) {
        return null
      }
    } else {
      return null
    }
  }

  this.getJSDateFromSegTSP = function (seg, nr) {
    try {
      var base = seg.getEl(nr)
      return this.getJSDateFromSeg(base, 1, 2)
    } catch (e) {
      return null
    }
  }

  this.getJSDateFromSeg = function (seg, date_nr, time_nr) {
    if (seg) {
      try {
        var date = seg.getEl(date_nr)
        var time = '000000'
        try {
          if (time_nr) time = seg.getEl(time_nr)
        } catch (eee) {}
        var result = new Date()
        result.setTime(0)
        result.setYear(parseInt(date.substr(0, 4), 10))
        result.setMonth(parseInt(date.substr(4, 2), 10) - 1)
        result.setDate(parseInt(date.substr(6, 2), 10))
        result.setHours(parseInt(time.substr(0, 2), 10))
        result.setMinutes(parseInt(time.substr(2, 2), 10))
        result.setSeconds(parseInt(time.substr(4, 2), 10))
        return result
      } catch (ee) {
        return null
      }
    } else {
      return null
    }
  }

  this.escapeUserString = function (str) {
    // escapes special characters with a '?'
    // use this when forwarding user defined input (such as username/password) to a server
    //
    // SOURCE: http://linuxwiki.de/HBCI/F%C3%BCrEntwickler
    // TODO: find better/official source
    return str.replace(/[?+:]/g, '?$&')
  }
}()

var DatenElementGruppe = function () {
  var me_deg = this
  me_deg.next_el = 0
  me_deg.data = new Array()
  me_deg.desc = new Array()

  me_deg.addDE = function (val) {
    me_deg.data[me_deg.next_el] = val
    me_deg.desc[me_deg.next_el] = 1
    me_deg.next_el++
  }

  me_deg.addDEbin = function (val) {
    me_deg.data[me_deg.next_el] = val
    me_deg.desc[me_deg.next_el] = 3
    me_deg.next_el++
  }

  me_deg.addDEG = function (grup) {
    me_deg.data[me_deg.next_el] = grup
    me_deg.desc[me_deg.next_el] = 2
    me_deg.next_el++
  }

  me_deg.parse = function (parser) {
    var start_pos
    var first = false
    while (!first || (parser.getCurrentChar() == ':' && parser.hasNext())) {
      if (!first) first = true
      else parser.nextPos()
      start_pos = parser.getCurrentPos()
      parser.setMarkerWithCurrentPos('start')
      if (parser.getCurrentChar() == '@') {
        // binary
        parser.nextPos()
        parser.setMarkerWithCurrentPos('start')
        if (!parser.gotoNextValidChar('@')) throw new ParseError('Seg', 'Error binary!', start_pos)
        var len = parseInt(parser.getTextFromMarkerToCurrentPos('start'), 10)
        parser.nextPos()
        parser.setMarkerWithCurrentPos('start')
        parser.setCurrentPos(parser.getCurrentPos() + len)
        if ("+:'".indexOf(parser.getCurrentChar()) == -1) throw new ParseError('Seg', 'Error binary, Wrong Length!' + len, start_pos)
        me_deg.addDEbin(parser.getTextFromMarkerToCurrentPos('start'))
        parser.nextPos()
      } else if (parser.gotoNextValidCharButIgnoreWith("+:'", '?')) {
        // Normales datenelement
        me_deg.addDE(parser.getTextFromMarkerToCurrentPos('start'))
        // Datengruppe können nicht bestandteil einer datengruppe sein
      } else {
        throw new ParseError('Seg', 'Unerwartetes ENDE!', start_pos)
      }
    }
  }

  me_deg.transformForSend = function () {
    var result = ''
    for (var i = 0; i != me_deg.data.length; i++) {
      if (me_deg.data[i] != NULL) {
        if (me_deg.desc[i] == 1) {
          result += (i != 0 ? ':' : '') + me_deg.data[i] // DE
        } else if (me_deg.desc[i] == 2) { // kommt nicht vor
          result += (i != 0 ? ':' : '') + me_deg.data[i].transformForSend() // DEG
        } else if (me_deg.desc[i] == 3) {
          result += (i != 0 ? ':' : '') + '@' + me_deg.data[i].length + '@' + me_deg.data[i] // BIN DAT
        }
      } else {
        // leer
        result += (i != 0 ? ':' : '')
      }
    }
    return result
  }

  me_deg.getEl = function (i) {
    return me_deg.data[i - 1]
  }
}

var Segment = function () {
  var me_seg = this
  me_seg.name = null
  me_seg.nr = 0
  me_seg.vers = 0
  me_seg.bez = 0
  me_seg.store = new DatenElementGruppe()

  me_seg.init = function (n, nr, ve, be) {
    me_seg.name = n
    me_seg.nr = nr
    me_seg.vers = ve
    me_seg.bez = be
  }

  me_seg.transformForSend = function () {
    var result = ''
    result += me_seg.name // Nr. 1 Segmentkennung an ..6 M 1
    result += ':' + me_seg.nr // Nr. 2 Segmentnummer num ..3 M 1 >=1
    result += ':' + me_seg.vers // Nr. 3 Segmentversion GD num ..3 M 1
    if (me_seg.bez !== 0) result += ':' + me_seg.bez
    for (var i = 0; i != me_seg.store.data.length; i++) {
      if (me_seg.store.data[i] != NULL) {
        if (me_seg.store.desc[i] == 1) {
          result += '+' + me_seg.store.data[i] // DE
        } else if (me_seg.store.desc[i] == 2) {
          result += '+' + me_seg.store.data[i].transformForSend() // DEG
        } else if (me_seg.store.desc[i] == 3) {
          result += '+@' + me_seg.store.data[i].length + '@' + me_seg.store.data[i] // BIN DAT
        }
      } else {
        // leer
        result += '+'
      }
    }
    result += "'"
    return result
  }

  me_seg.parse = function (parser) {
    var start_pos = parser.getCurrentPos()
    // 1. Segmentkopf
    // Nr. 1 Segmentkennung an ..6 M 1
    parser.setMarkerWithCurrentPos('start')
    if (parser.gotoNextValidChar(':')) {
      me_seg.name = parser.getTextFromMarkerToCurrentPos('start')
    } else {
      throw new ParseError('Seg', 'Segmentkennung Fehlt!', start_pos)
    }

    // Nr. 2 Segmentnummer num ..3 M 1 >=1
    parser.nextPos()
    start_pos = parser.getCurrentPos()
    parser.setMarkerWithCurrentPos('start')
    if (parser.gotoNextValidChar(':')) {
      me_seg.nr = parser.getTextFromMarkerToCurrentPos('start')
    } else {
      throw new ParseError('Seg', 'Segmentnummer fehlt!', start_pos)
    }

    // Nr. 3 Segmentversion GD num ..3 M 1
    parser.nextPos()
    start_pos = parser.getCurrentPos()
    parser.setMarkerWithCurrentPos('start')
    if (parser.gotoNextValidChar(":+'")) {
      me_seg.vers = parser.getTextFromMarkerToCurrentPos('start')
    } else {
      throw new ParseError('Seg', 'Segmentversion fehlt!', start_pos)
    }

    // Nr. 4 Bezugssegment GD num ..3 K 1 >=1
    if (parser.getCurrentChar() == ':') {
      parser.nextPos()
      start_pos = parser.getCurrentPos()
      parser.setMarkerWithCurrentPos('start')
      if (parser.gotoNextValidChar('+')) {
        me_seg.bez = parser.getTextFromMarkerToCurrentPos('start')
      } else {
        throw new ParseError('Seg', 'Unerwartetes ENDE!', start_pos)
      }
    }

    // jetzt kommen datenlemente oder datenelementgruppen
    while (parser.getCurrentChar() != "'" && parser.hasNext()) {
      parser.nextPos()
      start_pos = parser.getCurrentPos()
      parser.setMarkerWithCurrentPos('start')
      if (parser.getCurrentChar() == '@') {
        // binary
        parser.nextPos()
        parser.setMarkerWithCurrentPos('start')
        if (!parser.gotoNextValidChar('@')) throw new ParseError('Seg', 'Error binary!', start_pos)
        var len = parseInt(parser.getTextFromMarkerToCurrentPos('start'), 10)
        parser.nextPos()
        parser.setMarkerWithCurrentPos('start')
        parser.setCurrentPos(parser.getCurrentPos() + len)
        if ("+:'".indexOf(parser.getCurrentChar()) == -1) throw new ParseError('Seg', 'Error binary, Wrong Length!' + len, start_pos)
        me_seg.store.addDEbin(parser.getTextFromMarkerToCurrentPos('start'))
      } else if (parser.gotoNextValidCharButIgnoreWith("+:'", '?')) {
        if (parser.getCurrentChar() == '+' || parser.getCurrentChar() == "'") {
          // Normales datenelement
          me_seg.store.addDE(parser.getTextFromMarkerToCurrentPos('start'))
        } else {
          // Datengruppe
          parser.setPosBackToMarker('start')
          var neu_deg = new DatenElementGruppe()
          neu_deg.parse(parser)
          me_seg.store.addDEG(neu_deg)
        }
      } else {
        throw new ParseError('Seg', 'Unerwartetes ENDE!', start_pos)
      }
    }
  }

  me_seg.getEl = function (nr) {
    return me_seg.store.data[nr - 1]
  }
}

var Nachricht = function (proto_version) {
  var me_msg = this
  me_msg.segments = new Array()
  me_msg.segments_ctr = 0
  me_msg.sign_it = null
  me_msg.hnvsk = null
  me_msg.msg_nr = 0
  me_msg.proto_version = proto_version

  me_msg.sign = function (sign_obj) { // sign_obj = {'pin':pin,'tan':tan,'sys_id':0}// Tan bitte null setzen wenn nicht benötigt
    me_msg.sign_it = sign_obj
  }

  me_msg.init = function (dialog_id, ongoing_nr, blz, kunden_id) {
    // this is called wenn es ein outgoing message ist
    me_msg.msg_nr = ongoing_nr
    var seg = new Segment()
    seg.init('HNHBK', 1, 3, 0)
    me_msg.addSeg(seg)
    seg.store.addDE(Helper.getNrWithLeadingNulls(0, 12)) // Länge
    seg.store.addDE(me_msg.proto_version + '') // Version
    seg.store.addDE(dialog_id) // Dialog-ID, bei 0 beginnend wird von KI bekannt gegeben
    seg.store.addDE(me_msg.msg_nr) // Nachrichten-Nr. streng monoton von 1 ab steigen
    if (me_msg.sign_it) { // NUr für das Pin/Tan Verfahren 1 Schritt!
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
      var signature_id = (me_msg.sign_it.sys_id + '') == '0' ? 1 : me_msg.sign_it.sig_id
      me_msg.sign_it.blz = blz
      me_msg.sign_it.kunden_id = kunden_id

      var seg_vers, sec_profile
      if (me_msg.proto_version == 300) {
        me_msg.sign_it.server === undefined
          ? me_msg.addSeg(Helper.newSegFromArray('HNSHK', 4, [
            ['PIN', me_msg.sign_it.pin_vers == '999' ? 1 : 2], me_msg.sign_it.pin_vers, 1, 1, 1, [1, NULL, me_msg.sign_it.sys_id], signature_id, [1, Helper.convertDateToDFormat(new Date()), Helper.convertDateToTFormat(new Date())],
            [1, 999, 1],
            [6, 10, 16],
            [280, blz, kunden_id, 'S', 0, 0]
          ]))
          : me_msg.addSeg(Helper.newSegFromArray('HNSHK', 4, [
            ['PIN', me_msg.sign_it.pin_vers == '999' ? 1 : 2], me_msg.sign_it.pin_vers, 1, 1, 1, [2, NULL, me_msg.sign_it.sys_id], signature_id, [1, Helper.convertDateToDFormat(new Date()), Helper.convertDateToTFormat(new Date())],
            [1, 999, 1],
            [6, 10, 16],
            [280, blz, kunden_id, 'S', 0, 0]
          ]))
      } else {
        me_msg.sign_it.server === undefined
          ? me_msg.addSeg(Helper.newSegFromArray('HNSHK', 3, [me_msg.sign_it.pin_vers, 1, 1, 1, [1, NULL, me_msg.sign_it.sys_id], signature_id, [1, Helper.convertDateToDFormat(new Date()), Helper.convertDateToTFormat(new Date())],
            [1, 999, 1],
            [6, 10, 16],
            [280, blz, kunden_id, 'S', 0, 0]
          ]))
          : me_msg.addSeg(Helper.newSegFromArray('HNSHK', 3, [me_msg.sign_it.pin_vers, 1, 1, 1, [2, NULL, me_msg.sign_it.sys_id], signature_id, [1, Helper.convertDateToDFormat(new Date()), Helper.convertDateToTFormat(new Date())],
            [1, 999, 1],
            [6, 10, 16],
            [280, blz, kunden_id, 'S', 0, 0]
          ]))
      }
    }
  }

  me_msg.parse = function (in_txt) {
    var parser = new Parser(in_txt)

    while (parser.hasNext()) {
      var segm = new Segment()
      segm.parse(parser)
      me_msg.segments.push(segm)
      parser.nextPos()
    }

    // prüfen ob verschlüsselt war
    if (me_msg.segments.length == 4 && me_msg.segments[1].name == 'HNVSK' && me_msg.segments[2].name == 'HNVSD') {
      var first = me_msg.segments[0]
      me_msg.hnvsk = me_msg.segments[1]
      var seg_hnvsd = me_msg.segments[2]
      var last = me_msg.segments[3]
      // Neue Segmente hinzufügen
      me_msg.segments = new Array()
      me_msg.segments.push(first)
      if ((me_msg.hnvsk.vers == '3' && me_msg.hnvsk.getEl(1).getEl(1) == 'PIN') || (me_msg.hnvsk.vers == '2' && me_msg.hnvsk.getEl(1) == '998')) {
        var parser2 = new Parser(seg_hnvsd.getEl(1))
        while (parser2.hasNext()) {
          var segm2 = new Segment()
          segm2.parse(parser2)
          me_msg.segments.push(segm2)
          parser2.nextPos()
        }
      } else {
        throw new ParseError('Msg', 'Nicht unterstützte Verschlüsselungsmethode!', 0)
      }
      me_msg.segments.push(last)
    }
  }

  me_msg.transformForSend = function () {
    var top = me_msg.segments[0].transformForSend()
    var body = ''

    // Signatur abschluss
    if (me_msg.sign_it) {
      // Signaturabschluss
      // Sicherheitskontrollreferenz 1 muss mit signaturkopf übereinstimmen
      // Validierungsresultat null, bleibt bei PinTan leer
      // Benutzerdefinierte Signatur [Pin,Tan], die Tan nur dann wenn durch den Geschäftsvorfall erforderlich
      if (me_msg.sign_it.server === undefined) {
        if (me_msg.sign_it.tan === NULL) {
          me_msg.addSeg(Helper.newSegFromArray('HNSHA', me_msg.proto_version == 300 ? 2 : 1, [1, NULL, [me_msg.sign_it.pin]]))
        } else {
          me_msg.addSeg(Helper.newSegFromArray('HNSHA', me_msg.proto_version == 300 ? 2 : 1, [1, NULL, [me_msg.sign_it.pin, me_msg.sign_it.tan]]))
        }
      } else {
        me_msg.addSeg(Helper.newSegFromArray('HNSHA', 2, [2]))
      }
    }

    for (var i = 1; i != me_msg.segments.length; i++) {
      body += me_msg.segments[i].transformForSend()
    }

    // Letztes segment erstellen
    if (me_msg.sign_it) {
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
      // +998+1+1::0+1:20141216:205751+2:2:13:@8@:5:1+280:12345678:max:V:0:0+0'
      if (me_msg.proto_version == 300) {
        me_msg.hnvsk = Helper.newSegFromArray('HNVSK', 3, [
          ['PIN', me_msg.sign_it.pin_vers == '999' ? 1 : 2], 998, 1, [1, NULL, me_msg.sign_it.sys_id],
          [1, Helper.convertDateToDFormat(new Date()), Helper.convertDateToTFormat(new Date())],
          [2, 2, 13, Helper.Byte('\0\0\0\0\0\0\0\0'), 5, 1],
          [280, me_msg.sign_it.blz, me_msg.sign_it.kunden_id, 'V', 0, 0], 0
        ])
      } else {
        me_msg.hnvsk = Helper.newSegFromArray('HNVSK', 2, [998, 1, [1, NULL, me_msg.sign_it.sys_id],
          [1, Helper.convertDateToDFormat(new Date()), Helper.convertDateToTFormat(new Date())],
          [2, 2, 13, Helper.Byte('\0\0\0\0\0\0\0\0'), 5, 1],
          [280, me_msg.sign_it.blz, me_msg.sign_it.kunden_id, 'V', 0, 0], 0
        ])
      }
      me_msg.hnvsk.nr = 998
      var seg_hnvsd = Helper.newSegFromArray('HNVSD', 1, [Helper.Byte(body)])
      seg_hnvsd.nr = 999
      body = me_msg.hnvsk.transformForSend()
      body += seg_hnvsd.transformForSend()
    }

    // Abschließen
    var seg = Helper.newSegFromArray('HNHBS', 1, [me_msg.msg_nr])
    me_msg.addSeg(seg)
    body += seg.transformForSend()
    var llength = top.length + body.length
    me_msg.segments[0].store.data[0] = Helper.getNrWithLeadingNulls(llength, 12)
    top = me_msg.segments[0].transformForSend()
    return top + body
  }

  me_msg.addSeg = function (seg) {
    seg.nr = me_msg.segments_ctr + 1
    me_msg.segments[me_msg.segments_ctr] = seg
    me_msg.segments_ctr++
    return seg.nr
  }

  me_msg.isSigned = function () {
    return me_msg.selectSegByName('HNSHK').length == 1
  }

  me_msg.selectSegByName = function (name) {
    var r = []
    for (var i = 0; i != me_msg.segments.length; i++) {
      if (me_msg.segments[i].name == name) {
        r.push(me_msg.segments[i])
      }
    }
    return r
  }

  me_msg.selectSegByBelongTo = function (belong_to) {
    var r = []
    for (var i = 0; i != me_msg.segments.length; i++) {
      if (me_msg.segments[i].bez == (belong_to + '')) {
        r.push(me_msg.segments[i])
      }
    }
    return r
  }

  me_msg.selectSegByNameAndBelongTo = function (name, belong_to) {
    var r = []
    for (var i = 0; i != me_msg.segments.length; i++) {
      if (me_msg.segments[i].name == name && me_msg.segments[i].bez == (belong_to + '')) {
        r.push(me_msg.segments[i])
      }
    }
    return r
  }

  // Nur für Debug/Entwicklungszwecke um ein JS Response aus einem echten Response zu generieren
  me_msg.create_debug_js = function () {
    var top = 'var sendMsg = new FinTSClient().testReturnMessageClass();\n\r'
    var sig = '\n\r'
    var body = ''

    for (var i = 0; i != me_msg.segments.length; i++) {
      if (me_msg.segments[i].name == 'HNHBK' ||
          me_msg.segments[i].name == 'HNHBS' ||
          me_msg.segments[i].name == 'HNSHA') {
        // auslassen
      } else if (me_msg.segments[i].name == 'HNSHK') {
        // Signatur
        sig = "sendMsg.sign({'pin':'pin1234','tan':null,'sys_id':'" + me_msg.segments[i].getEl(6).getEl(3) + "'});\n\r"
      } else {
        // generate array structure out of segment
        var seg_array = new Array()

        for (var a = 0; a != me_msg.segments[i].store.data.length; a++) {
          if (me_msg.segments[i].store.desc[a] == 1) { // DE
            seg_array.push(me_msg.segments[i].store.data[a])
          } else if (me_msg.segments[i].store.desc[a] == 2) { // DEG
            // DEG durchforsten
            var deg_array = new Array()

            for (var d = 0; d != me_msg.segments[i].store.data[a].data.length; d++) {
              if (me_msg.segments[i].store.data[a].desc[d] == 1) { // DE
                deg_array.push(me_msg.segments[i].store.data[a].data[d])
              } else if (me_msg.segments[i].store.data[a].desc[d] == 2) { // DEG
                // sollte hier garnicht auftreten
                throw 'FEHLER DEG erhalten wo dies nicht passieren sollte'
              } else if (me_msg.segments[i].store.desc[a].desc[d] == 3) { // BINARY
                deg_array.push('BYTE' + me_msg.segments[i].store.data[a].data[d])
              }
            }

            seg_array.push(deg_array)
          } else if (me_msg.segments[i].store.desc[a] == 3) { // BINARY
            seg_array.push('BYTE' + me_msg.segments[i].store.data[a])
          }
        }

        if (me_msg.segments[i].bez == 0) {
          body += "sendMsg.addSeg(Helper.newSegFromArray('" + me_msg.segments[i].name + "', " + me_msg.segments[i].vers + ', ' + JSON.stringify(seg_array) + '));\n\r'
        } else {
          body += "sendMsg.addSeg(Helper.newSegFromArrayWithBez('" + me_msg.segments[i].name + "', " + me_msg.segments[i].vers + ',' + me_msg.segments[i].bez + ',' + JSON.stringify(seg_array) + '));\n\r'
        }
      }
    }
    return top + sig + body
  }
}

var Exceptions = {}

Exceptions.OpenFinTSClientException = function () {
  Error.call(this) // super constructor
  Error.captureStackTrace(this, this.constructor)
}
util.inherits(Exceptions.OpenFinTSClientException, Error)
Exceptions.OpenFinTSClientException.prototype.toString = function () {
  return this.message ? this.message : 'OpenFinTSClientException'
}

Exceptions.GVNotSupportedByKI = function (type, avail) {
  Exceptions.OpenFinTSClientException.call(this)
  this.gv_type = type
  this.sp_vers = avail ? [] : Object.keys(avail)
  this.message = 'There is no version of ' + this.gv_type + ' which is supported by both, the client and the server.'
}
util.inherits(Exceptions.GVNotSupportedByKI, Exceptions.OpenFinTSClientException)

Exceptions.MalformedMessageFormat = function (msg) {
  Exceptions.OpenFinTSClientException.call(this)
  this.message = 'MalformedMessage: ' + msg
}
util.inherits(Exceptions.MalformedMessageFormat, Exceptions.OpenFinTSClientException)

Exceptions.OrderFailedException = function (msg) {
  Exceptions.OpenFinTSClientException.call(this)
  this.msg_detail = msg
  this.message = 'Failed to perform Order, got error Message from Server.:' + msg.getEl(3)
}
util.inherits(Exceptions.OrderFailedException, Exceptions.OpenFinTSClientException)

Exceptions.InternalError = function (msg_txt) {
  Exceptions.OpenFinTSClientException.call(this)
}
util.inherits(Exceptions.InternalError, Exceptions.OpenFinTSClientException)

Exceptions.GVFailedAtKI = function (msg) {
  Exceptions.OpenFinTSClientException.call(this)
  this.data = msg
  this.message = 'GVFailed because Msg: ' + this.data[0] + ' - ' + this.data[2]
}
util.inherits(Exceptions.GVFailedAtKI, Exceptions.OpenFinTSClientException)

Exceptions.ConnectionFailedException = function (hostname) {
  Exceptions.OpenFinTSClientException.call(this)
  this.host = hostname
  this.toString = function () {
    return 'Connection to ' + this.host + ' failed.'
  }
}
util.inherits(Exceptions.ConnectionFailedException, Exceptions.OpenFinTSClientException)

  /* Exceptions.WrongUserOrPinError = function(){
  	Exceptions.OpenFinTSClientException.call(this);
  	this.toString = function(){
  		return "Wrong user or wrong pin.";
  	};
  };
  util.inherits(Exceptions.WrongUserOrPinError, Exceptions.OpenFinTSClientException); */

Exceptions.MissingBankConnectionDataException = function (blz) {
  Exceptions.OpenFinTSClientException.call(this)
  this.blz = blz
  this.toString = function () {
    return 'No connection Url in Bankenliste found to connect to blz: ' + this.blz + '.'
  }
}
util.inherits(Exceptions.MissingBankConnectionDataException, Exceptions.OpenFinTSClientException)

Exceptions.OutofSequenceMessageException = function () {
  Exceptions.OpenFinTSClientException.call(this)
  this.toString = function () {
    return 'You have to ensure that only one message at a time is send to the server, use libraries like async or promisses. You can send a new message as soon as the callback returns.'
  }
}
util.inherits(Exceptions.OutofSequenceMessageException, Exceptions.OpenFinTSClientException)
/*
	.msg({ type:"",
	ki_type:"",
	  send_msg:{
		1:[],
		2:[],
		3:function(){}
	  },
	  recv_msg:{
		1:function(seg_vers,relatedRespSegments,releatedRespMsgs,recvMsg)
		2:
	  },
	  aufsetzpunkt_loc:[]
	});
	.done(function(error,order,recvMsg){

	});
*/

// TODO implement TanVerfahren in Order
var Order = function (client) {
  var me_order = this
  me_order.client = client
  me_order.error = null

  var int_req_tan = false
  var int_send_msg = []
  var int_gmsg_list = []

  me_order.requireTan = function () {
    in_req_tan = true
  }

  me_order.msg = function (in_data) {
    // 0. check no error
    if (me_order.error) {
      return false
    }
    // 1. check if we support one of the segment versions
    var act_vers = 0
    if (in_data.ki_type in client.bpd.gv_parameters) {
      var avail_vers = Object.keys(in_data.send_msg).sort(function (a, b) {
        return b - a
      })
      for (var i in avail_vers) {
        if (avail_vers[i] in client.bpd.gv_parameters[in_data.ki_type]) {
          act_vers = avail_vers[i]
          break
        }
      }
    }
    if (act_vers == 0) {
      console.log("Angefragte Aktion nicht erlaubt")
      me_order.error = new Exceptions.GVNotSupportedByKI(in_data.ki_type, client.bpd.gv_parameters[in_data.ki_type])
      return false
    }
    // 2. Find the appropriate action
    var act = null
    if (typeof in_data.recv_msg === 'function') {
      act = in_data.recv_msg
    } else if (act_vers in in_data.recv_msg) {
      act = in_data.recv_msg[act_vers]
    } else if (0 in in_data.recv_msg) {
      act = in_data.recv_msg[0]
    } else {
      act = function () {}
    }
    // 3. Prepare the Send Message object
    int_send_msg.push({
      version: act_vers,
      segment: Helper.newSegFromArray(in_data.type, act_vers, in_data.send_msg[act_vers]),
      action: act,
      aufsetzpunkt: null,
      aufsetzpunkt_loc: (in_data.aufsetzpunkt_loc ? in_data.aufsetzpunkt_loc : []),
      finished: false,
      collected_segments: [],
      collected_messages: []
    })
  }

  me_order.done = function (cb) {
    // Exit CB is called when the function returns here it is checked if an error occures and then disconnects
    var exit_cb = function (error, order, recvMsg) {
      if (error) {
        me_order.client.MsgEndDialog(function (error2, recvMsg2) {
          if (error2) {
            me_order.client.log.con.error({
              error: error2
            }, 'Connection close failed after error.')
          } else {
            me_order.client.log.con.debug('Connection closed okay, after error.')
          }
        })
      }
      cb(error, order, recvMsg)
    }
    // Main Part
    if (me_order.error) {
      exit_cb(me_order.error, me_order, null)
    } else {
      // Message prepare
      var perform = function () {
        var msg = new Nachricht(me_order.client.proto_version)
        msg.sign({
          'pin': me_order.client.pin,
          'tan': NULL,
          'sys_id': me_order.client.sys_id,
          'pin_vers': me_order.client.upd.availible_tan_verfahren[0],
          'sig_id': me_order.client.getNewSigId()
        })
        msg.init(me_order.client.dialog_id, me_order.client.next_msg_nr, me_order.client.blz, me_order.client.kunden_id)
        me_order.client.next_msg_nr++
        // Fill in Segments

        for (var j in int_send_msg) {
          if (!int_send_msg[j].finished) {
            // 1. Resolve Aufsetzpunkt if required, TODO here diferntiate between versions
            if (int_send_msg[j].aufsetzpunkt) {
              if (int_send_msg[j].aufsetzpunkt_loc.length >= 1) {
                for (; int_send_msg[j].segment.store.data.length < int_send_msg[j].aufsetzpunkt_loc[0];) {
                  int_send_msg[j].segment.store.addDE(NULL)
                }
                if (int_send_msg[j].aufsetzpunkt_loc.length <= 1) {
                  // direkt
                  int_send_msg[j].segment.store.data[int_send_msg[j].aufsetzpunkt_loc[0] - 1] = int_send_msg[j].aufsetzpunkt
                } else {
                  // Unter DEG
                  exit_cb(new Exceptions.InternalError('Aufsetzpunkt Location is in DEG not supported yet.'), me_order, null)
                  return
                }
              } else {
                exit_cb(new Exceptions.InternalError('Aufsetzpunkt Location is not set but an aufsetzpunkt was delivered'), me_order, null)
                return
              }
            }
            // 2. Add Segment
            msg.addSeg(int_send_msg[j].segment)
          }
        }
        // Send Segments to Destination
        me_order.client.SendMsgToDestination(msg, function (error, recvMsg) {
          if (error) {
            exit_cb(error, me_order, null)
          } else {
            var got_aufsetzpunkt = false
            // 1. global Message testen
            var gmsg_exception = null
            try {
              var HIRMG = recvMsg.selectSegByName('HIRMG')[0]
              for (var i in HIRMG.store.data) {
                int_gmsg_list.push(HIRMG.store.data[i].data)
                if (gmsg_exception == null && HIRMG.store.data[i].data[0].charAt(0) == '9') {
                  gmsg_exception = new Exceptions.OrderFailedException(HIRMG.store.data[i].data)
                }
              }
            } catch (ee) {
              exit_cb(new Exceptions.MalformedMessageFormat('HIRMG is mandatory but missing.'), me_order, recvMsg)
              return
            };
            if (gmsg_exception != null) {
              exit_cb(gmsg_exception, me_order, recvMsg)
              return
            }
            // 2. einzelne Resp Segmente durchgehen
            try {
              for (var j in int_send_msg) {
                var related_segments = recvMsg.selectSegByBelongTo(int_send_msg[j].segment.nr)
                int_send_msg[j].finished = true
                for (var i in related_segments) {
                  if (related_segments[i].name == 'HIRMS') {
                    var HIRMS = related_segments[i]
                    for (var a in HIRMS.store.data) {
                      int_send_msg[j].collected_messages.push(HIRMS.store.data[a].data)
                      if (HIRMS.store.data[a].data[0] == '3040') {
                        // Got an Aufsetzpunkt
                        try {
                          int_send_msg[j].aufsetzpunkt = HIRMS.store.data[a].data[3]
                        } catch (eee) {
                          int_send_msg[j].aufsetzpunkt = null
                        };
                        int_send_msg[j].finished = false
                        got_aufsetzpunkt = true
                      }
                    }
                  } else {
                    int_send_msg[j].collected_segments.push(related_segments[i])
                  }
                }
              }
            } catch (ee) {
              exit_cb(new Exceptions.InternalError('Failed parsing Segments'), me_order, recvMsg)
            };
            // 3. check if we had an aufsetzpunkt
            if (got_aufsetzpunkt) {
              perform()
            } else {
              // 4. Fertig die callbacks rufen
              for (var j in int_send_msg) {
                int_send_msg[j].action(int_send_msg[j].version, int_send_msg[j].collected_segments, int_send_msg[j].collected_messages, recvMsg)
              }
              exit_cb(null, me_order, recvMsg)
            }
          }
        })
      }
      perform()
    }
  }

  me_order.checkMessagesOkay = function (messages, throw_when_error) {
    for (var i in messages) {
      var type = messages[i][0].charAt(0)
      if (type == '9') {
        if (throw_when_error) {
          Exceptions.GVFailedAtKI(messages[i])
        }
        return false
      }
    }
    return true
  }

  me_order.getSegByName = function (list, name) {
    for (var i in list) {
      if (list[i].name == name) {
        return list[i]
      }
    }
    return null
  }

  me_order.getElFromSeg = function (seg, nr, default_v) {
    if (seg) {
      var e = null
      try {
        e = seg.getEl(nr)
      } catch (e2) {
        e = default_v
      }
      return e
    } else {
      return default_v
    }
  }

  me_order.checkKITypeAvailible = function (ki_type, vers, return_param) {
    if (ki_type in me_order.client.bpd.gv_parameters) {
      var p_return = {}
      var test_vers = []

      if (vers instanceof Array) {
        test_vers = test_vers.concat(vers)
      } else {
        test_vers.push(vers)
      }

      for (var vindex in test_vers) {
        if (test_vers[vindex] in me_order.client.bpd.gv_parameters[ki_type]) {
          if (return_param) {
            p_return[vindex] = me_order.client.bpd.gv_parameters[ki_type][test_vers[vindex]]
          } else {
            return true
          }
        }
      }

      if (return_param) {
        return p_return
      } else {
        return false
      }
    } else {
      if (return_param) {
        return {}
      } else {
        return false
      }
    }
  }
}

function OrderHelperChain () {
  this.returner = {}
};

OrderHelperChain.prototype.vers = function (v, cb) {
  if (v instanceof Array) {
    for (var i in v) {
      this.returner[v[i]] = cb
    }
  } else if (v) {
    this.returner[v] = cb
  } else {
    throw new Error('Development Error ' + v + ' not defined')
  }
  return this
}

OrderHelperChain.prototype.done = function () {
  return this.returner
}

Order.prototype.Helper = function () {
  return new OrderHelperChain()
}

var beautifyBPD = function (bpd) {
  var cbpd = bpd.clone()
  cbpd.gv_parameters = '...'
  return cbpd
}

module.exports = {}
module.exports.Helper = Helper
module.exports.Nachricht = Nachricht
module.exports.Segment = Segment
module.exports.DatenElementGruppe = DatenElementGruppe
module.exports.Konto = Konto
module.exports.ByteVal = ByteVal
module.exports.NULL = NULL
module.exports.beautifyBPD = beautifyBPD
module.exports.Order = Order
module.exports.Exceptions = Exceptions
