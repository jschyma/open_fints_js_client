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
var p_classes = require('./Parser.js')
var Parser = p_classes.Parser
var ParseError = p_classes.ParseError
// This Parser parses S.W.I.F.T MTXXX Formats
// http://www.hbci-zka.de/dokumente/spezifikation_deutsch/fintsv3/FinTS_3.0_Messages_Finanzdatenformate_2010-08-06_final_version.pdf

module.exports = function () {
  var me = this
  me.msgss = []

  me.parse = function (txt) {
    var cur_msg = []
    var msgs = []
    var parser = new Parser(txt)

    // SWIFT Protokoll
    // Nachrichten
    // 	enthalten Felder :Zahl:   Trennzeichen
    // Der Kontoauszug kann über mehrere Nachrichten verteilt werden
    //
    // Trennzeichen = \r\n Kompatibilität @@
    // Syntax:
    // Nachrichten Begin:		\r\n-\r\n	oder @@				(optional)
    // Feld						:Zahl: 		(\r\n oder @@)
    // Feld Mehrfach			:Zahl:		(\r\n oder @@)(mehrfach)
    // Nachrichten Ende:		-\r\n	oder (@@ und dann muss direkt wieder @@ als Anfang folgen)
    while (parser.hasNext()) {
      if (parser.gotoNextValidChar(':')) {
        parser.nextPos()
        parser.setMarkerWithCurrentPos('start')
        parser.gotoNextValidChar(':')
        var tag = parser.getTextFromMarkerToCurrentPos('start')
        parser.nextPos()
        parser.setMarkerWithCurrentPos('start')
        parser.gotoNextValidString(['\r\n', '@@'])
        var val = parser.getTextFromMarkerToCurrentPos('start')
        parser.nextPos()
        parser.nextPos()
        // Für Feld Mehrfach
        while (parser.hasNext() && !(parser.getCurrentChar() == ':' || (parser.getCurrentChar() == '-' && parser.data[parser.cur_pos + 1] == '\r' && parser.data[parser.cur_pos + 2] == '\n') || parser.getCurrentChar() == '@')) {
          parser.setMarkerWithCurrentPos('start')
          parser.gotoNextValidString(['\r\n', '@@'])
          val += parser.getTextFromMarkerToCurrentPos('start')
          parser.nextPos()
          parser.nextPos()
        }
        cur_msg.push([tag, val])
      }
      // schauen ob die Message zuende ist
      if ((parser.cur_pos + 1 >= parser.data.length || (parser.getCurrentChar() == '@' && parser.data[parser.cur_pos + 1] == '@')) ||
        (parser.cur_pos + 2 >= parser.data.length || (parser.getCurrentChar() == '-' && parser.data[parser.cur_pos + 1] == '\r' && parser.data[parser.cur_pos + 2] == '\n'))) {
        msgs.push(cur_msg)
        cur_msg = []
        parser.nextPos()
        parser.nextPos()
        parser.nextPos()
      }
    }
    if (cur_msg.length > 0) {
      msgs.push(cur_msg)
    }
    // 1. Phase des Parsens beendet
    me.msgss = msgs
  }

  me.getKontoUmsaetzeFromMT940 = function () {
    var umsaetze = []
    for (var i = 0; i != me.msgss.length; i++) {
      var msg = me.msgss[i]
      var umsatz = {}
        // Starten
      for (var a = 0; a != msg.length; a++) {
        switch (msg[a][0]) {
          case '20':
            umsatz.refnr = msg[a][1]
            break
          case '21':
            umsatz.bez_refnr = msg[a][1]
            break
          case '25':
            umsatz.konto_bez = msg[a][1]
            break
          case '28C':
            umsatz.auszug_nr = msg[a][1]
            break
          case '60F': // Anfangssaldo
          case '60M': // Zwischensaldo
            me.parseMT940_60a(umsatz, msg, a)
            break
          case '61': // Loop
            a = me.parseMT940_loop(umsatz, msg, a)
            break
          case '62F': // Endsaldo
          case '62M': // Zwischensaldo
            me.parseMT940_62a(umsatz, msg, a)
            break
        }
      }
      umsaetze.push(umsatz)
    }
    return umsaetze
  }

  me.parseMT940_60a = function (umsatz, msg, a) {
    var string = msg[a][1]
    umsatz.anfangssaldo = {}
    umsatz.anfangssaldo.isZwischensaldo = msg[a][0][2] == 'M'
    umsatz.anfangssaldo.soll_haben = string[0] == 'C' ? 'H' : 'S'
    umsatz.anfangssaldo.buchungsdatum = me.convertMTDateFormatToJS(string.substr(1, 6))
    umsatz.anfangssaldo.currency = string.substr(7, 3)
    umsatz.anfangssaldo.value = parseFloat(string.substr(10, string.length).replace(',', '.'))
  }

  me.parseMT940_62a = function (umsatz, msg, a) {
    var string = msg[a][1]
    umsatz.schlusssaldo = {}
    umsatz.schlusssaldo.isZwischensaldo = msg[a][0][2] == 'M'
    umsatz.schlusssaldo.soll_haben = string[0] == 'C' ? 'H' : 'S'
    umsatz.schlusssaldo.buchungsdatum = me.convertMTDateFormatToJS(string.substr(1, 6))
    umsatz.schlusssaldo.currency = string.substr(7, 3)
    umsatz.schlusssaldo.value = parseFloat(string.substr(10, string.length).replace(',', '.'))
  }

  me.parseMT940_loop = function (umsatz, msg, a) {
    umsatz.saetze = []
    for (; a < msg.length && msg[a][0] == '61'; a++) {
      var satz = {}
      var pos = 0
      // 1. 61
      satz.datum = me.convertMTDateFormatToJS(msg[a][1].substr(0, 6))
      if ('0123456789'.indexOf(msg[a][1][6]) != -1) {
        // optionales feld Buchungstag
        pos = 10
      } else {
        pos = 6
      }
      if (msg[a][1][pos] == 'R') {
        satz.is_storno = true
        pos + 1
      } else {
        satz.is_storno = false
      }
      satz.soll_haben = msg[a][1][pos] == 'C' ? 'H' : 'S'
      pos++
      if ('0123456789'.indexOf(msg[a][1][pos]) == -1) {
        // optionales feld Währungsunterscheidung
        pos++
      } else {

      }
      // Betrag
      var start_pos = pos
      var end_pos = pos
      for (var j = start_pos; j < msg[a][1].length; j++) {
        if (msg[a][1][j] == 'N') {
          end_pos = j
          break
        }
      }
      satz.value = parseFloat(msg[a][1].substring(start_pos, end_pos).replace(',', '.'))
      pos = end_pos + 1
      // 2. 86
      a++
      me.parseMT940_86(satz, msg[a][1])
      // TODO hier gibt es auch noch eine weiter bearbeitung
      umsatz.saetze.push(satz)
    }
    a--
    return a
  }

  me.parseMT940_86 = function (satz, raw_verwen_zweck) {
    satz.is_verwendungszweck_object = raw_verwen_zweck[0] == '?' || raw_verwen_zweck[1] == '?' || raw_verwen_zweck[2] == '?' || raw_verwen_zweck[3] == '?'
    if (satz.is_verwendungszweck_object) {
      satz.verwendungszweck = {}
      satz.verwendungszweck.text = ''
      satz.verwendungszweck.name_kontrahent = ''
      var p = new Parser(raw_verwen_zweck)
      p.gotoNextValidChar('?')
      while (p.hasNext()) {
        // Hier sind wir immer auf einem ?
        p.nextPos()
        p.setMarkerWithCurrentPos('start')
        p.nextPos()
        p.nextPos()
        var code = p.getTextFromMarkerToCurrentPos('start')
        p.setMarkerWithCurrentPos('start')
        p.gotoNextValidChar('?')
        var value = p.getTextFromMarkerToCurrentPos('start')
        // Processing
        switch (code) {
          case '00':
            satz.verwendungszweck.buchungstext = value
            break
          case '10':
            satz.verwendungszweck.primanoten_nr = value
            break
          case '20':
          case '21':
          case '22':
          case '23':
          case '24':
          case '25':
          case '26':
          case '27':
          case '28':
          case '29':
          case '60':
          case '61':
          case '62':
          case '63':
            satz.verwendungszweck.text += value
            break
          case '30':
            satz.verwendungszweck.bic_kontrahent = value
            break
          case '31':
            satz.verwendungszweck.iban_kontrahent = value
            break
          case '32':
          case '33':
            satz.verwendungszweck.name_kontrahent += value
            break
          case '34':
            satz.verwendungszweck.text_key_addion = value
            break
        }
      }
    } else {
      satz.verwendungszweck = raw_verwen_zweck
    }
  }

  me.convertMTDateFormatToJS = function (date) {
    var dtYear = parseInt('20' + date.substr(0, 2), 10)
    var dtMonth = parseInt(date.substr(2, 2), 10) - 1
    var dtDate = parseInt(date.substr(4, 2), 10)

    return new Date(dtYear, dtMonth, dtDate)
  }
}
