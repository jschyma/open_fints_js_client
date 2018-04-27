/*
 *  Copyright 2015-2016 Jens Schyma jeschyma@gmail.com
 *  and in case of this file Reiner Bamberger
 *  This File is a Part of the source of Open-Fin-TS-JS-Client.
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
 *  See the NOTICE file distributed with this work for additional information
 *  regarding copyright ownership.
 */
/*
  Dieses Beispiel veranschaulicht wie der Client mit Promises und async/await zu verwenden ist um Kontoumsätze anzuzeigen.
*/
var FinTSClient = require('../') // require("open-fin-ts-js-client");
var log = null
try {
  var logme = false
  process.argv.forEach(function (val, index, array) {
    if (val == 'log') logme = true
  })
  if (logme) {
    var bunyan = require('bunyan')
    log = bunyan.createLogger({
      name: 'demo_fints_logger',
      stream: process.stdout,
      level: 'trace'
    })
  }
} catch (ee) {

};
// 1. Definition der Bankenliste - Echte URLs sind hier http://www.hbci-zka.de/institute/institut_auswahl.htm erhältlich
var bankenliste = {
  '12345678': {
    'blz': 12345678,
    'url': 'http://localhost:3000/cgi-bin/hbciservlet'
  },
  'undefined': {
    'url': ''
  }
}

// 2. FinTSClient anlegen
// BLZ: 12345678
// Kunden-ID/Benutzerkennung: test1
// PIN: 1234
// Bankenliste siehe oben
var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, log)
// start
GetKontoUmsaetze()

async function GetKontoUmsaetze () {
  try{
    // 3. Verbindung aufbauen
    await client.EstablishConnection()
    console.log('Erfolgreich Verbunden')

    // 4. Kontoumsätze für alle Konten nacheinander laden
    let daten=[]
    for (let konto of client.konten) {
      let data = await client.MsgGetKontoUmsaetze(konto.sepa_data, null, null)
      daten.push(data)
    }
    // Alles gut
    // 5. Umsätze darstellen
    console.log(JSON.stringify(daten))

    // 6. Zeige Salden
    for (let konto of client.konten) {
      let saldo = await client.MsgGetSaldo(konto.sepa_data)
      console.log('Saldo von Konto ' + konto.iban + ' ist ' + JSON.stringify(saldo.saldo.saldo))
    }

    // 7. Verbindung beenden
    await client.MsgEndDialog()
  }catch(exception){
    console.error("Fehler: " + exception)
  }
  // 8. Secure Daten im Objekt aus dem Ram löschen
  client.closeSecure()
  console.log('ENDE')
}
