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
'use strict'
var express = require('express')
var http = require('http')
var textBody = require('body')
var FinTSClient = require('../')
var should = require('should')

var previous_tests_ok = true
var checkPreviousTests = function () {
  if (!previous_tests_ok) throw new Error('Vorangegangene Tests sind fehlgeschlagen, aus Sicherheitsgründen, dass der Account nicht gesperrt wird hier abbrechen.')
  previous_tests_ok = false
}

var mocha_catcher = function (done, cb) {
  return function () {
    var orig_arguments = arguments
    try {
      cb.apply(null, orig_arguments)
    } catch (mocha_error) {
      done(mocha_error)
    }
  }
}

var bunyan = require('bunyan')
var live = require('bunyan-live-logger')
var g_log = null

var logger = function (n) {
  if (g_log) { return g_log.child({testcase: n}) } else { return null }
}

describe('test_real', function () {
  this.timeout(20 * 60 * 1000)
  var myFINTSServer = null
  var credentials = null
  before(function (done) {
    credentials = require('./credentials.js')
/*
module.exports = {
bankenliste:{
'12345678':{'blz':12345678,'url':"http://localhost:3000/cgi-bin/hbciservlet"},
"undefined":{'url':""}
},
blz:12345678,
user:"",
pin:"",
bunyan_live_logger:true
};
*/
    credentials.should.have.property('bankenliste')
    credentials.should.have.property('user')
    credentials.should.have.property('pin')
    credentials.should.have.property('blz')
    should(credentials.user).not.equal('')
    should(credentials.pin).not.equal('')
    if (credentials && credentials.bunyan_live_logger) {
      g_log = bunyan.createLogger({
        name: 'testcases - tests_real',
        src: true,
        streams: [
          {
            level: 'trace',
            stream: live({ready_cb: function () { done() }}),
            type: 'raw'
          }
        ]
      })
    } else {
      done()
    }
  })

  it('Test 1 - MsgInitDialog', function (done) {
    checkPreviousTests()
    var client = new FinTSClient(credentials.blz, credentials.user, credentials.pin, credentials.bankenliste, logger('Test 1'))
    var old_url = client.dest_url
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) {
        var pv = ''
        try {
          pv = recvMsg.selectSegByName('HNHBK')[0].getEl(2)
          console.log(pv)
        } catch (xe) { console.log(xe) }
        if (pv == '220') {
          previous_tests_ok = true
          return done(new Error('This is just because of HBCI 2.2 Error:' + error.toString()))
        } else { throw error }
      }
      client.bpd.should.have.property('vers_bpd')
      client.upd.should.have.property('vers_upd')
      client.sys_id.should.not.equal('')
      client.konten.should.be.an.Array
      client.MsgCheckAndEndDialog(recvMsg, mocha_catcher(done, function (error, recvMsg2) {
        if (error) { throw error }
        previous_tests_ok = true
        return done()
      }))
    }))
  })
  it('Test 2 - MsgInitDialog wrong user', function (done) {
    checkPreviousTests()
    var client = new FinTSClient(credentials.blz, 'wrong', '12345', credentials.bankenliste, logger('Test 2'))
    var old_url = client.dest_url
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      client.MsgCheckAndEndDialog(recvMsg, function (error, recvMsg2) {	})
      if (error) {
        previous_tests_ok = true
        return done()
      } else {
        throw 'Erfolg sollte nicht passieren'
      }
    }))
  })
  describe('wrong_pin_test', function () {
    var test_performed = false
    after(function (done) {
      if (test_performed) {
// login with good pin to reset bad counter
        var client = new FinTSClient(credentials.blz, credentials.user, credentials.pin, credentials.bankenliste, logger('wrong_pin_test after'))
        var old_url = client.dest_url
        client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
          if (error) { console.log(error) }
          client.MsgCheckAndEndDialog(recvMsg, mocha_catcher(done, function (error, recvMsg2) {
            if (error) { console.log(error) }
            done()
          }))
        }))
      } else {
        done()
      }
    })
    it('Test 3 - MsgInitDialog wrong pin', function (done) {
      checkPreviousTests()
      test_performed = true
      var client = new FinTSClient(credentials.blz, credentials.user, '12345', credentials.bankenliste, logger('Test 3'))
      var old_url = client.dest_url
      client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
        client.MsgCheckAndEndDialog(recvMsg, function (error2, recvMsg2) {	})
        should(error).not.be.null
        previous_tests_ok = true
        done()
      }))
    })
  })
  it('Test 6 - EstablishConnection', function (done) {
    checkPreviousTests()
    var client = new FinTSClient(credentials.blz, credentials.user, credentials.pin, credentials.bankenliste, logger('Test 6'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        client.MsgEndDialog(function (error, recvMsg2) {	})
        client.bpd.should.have.property('vers_bpd')
        client.upd.should.have.property('vers_upd')
        client.konten.should.be.an.Array
        previous_tests_ok = true
        done()
      }
    }))
  })
  it('Test 7 - MsgGetKontoUmsaetze', function (done) {
    checkPreviousTests()
    var client = new FinTSClient(credentials.blz, credentials.user, credentials.pin, credentials.bankenliste, logger('Test 7'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        client.konten[0].sepa_data.should.not.equal(null)
        client.MsgGetKontoUmsaetze(client.konten[0].sepa_data, null, null, mocha_catcher(done, function (error2, rMsg, data) {
          if (error2) {
            if (error2 instanceof client.Exceptions.GVNotSupportedByKI &&
error2.gv_type == 'HIKAZ') {
              previous_tests_ok = true
            }
            throw error2
          } else {
// Alles gut
            should(data).not.equal(null)
            data.should.be.an.Array
// Testcase erweitern
            client.MsgCheckAndEndDialog(rMsg, function (error, recvMsg2) {	})
            previous_tests_ok = true
            done()
          }
        }))
      }
    }))
  })
  it('Test 8 - MsgGetSaldo', function (done) {
    checkPreviousTests()
    var client = new FinTSClient(credentials.blz, credentials.user, credentials.pin, credentials.bankenliste, logger('Test 8'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        client.konten[0].sepa_data.should.not.equal(null)
        client.MsgGetSaldo(client.konten[0].sepa_data, mocha_catcher(done, function (error2, rMsg, data) {
          if (rMsg)	client.MsgCheckAndEndDialog(rMsg, function (error, recvMsg2) {	})
          if (error2) {
            throw error2
          } else {
// Testcase erweitern
            previous_tests_ok = true
            done()
          }
        }))
      }
    }))
  })
})
