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
var FinTSServer = require('../dev/FinTSServer.js')
var FinTSClient = require('../')
var should = require('should')
var config = null
try {
  config = require('./credentials.js')
} catch (e) {

}
var bunyan = require('bunyan')
var live = require('bunyan-live-logger')
var g_log = null

var logger = function (n) {
  if (g_log) { return g_log.child({testcase: n}) } else { return null }
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

describe('testserver', function () {
  this.timeout(2 * 60 * 1000)
  var myFINTSServer = null
  var bankenliste = {
    '12345678': {'blz': 12345678, 'url': 'http://TOBESET/cgi-bin/hbciservlet'},
    'undefined': {'url': ''}
  }
  before(function (done) {
// Start the Server
    var ipaddr = process.env.IP || '127.0.0.1'// process.env.IP;
    var port = process.env.PORT || 3000// process.env.PORT;
    var app = express()
    myFINTSServer = new FinTSServer()
    myFINTSServer.my_debug_log = false
    app.get('/', function (req, res) {
      res.setHeader('Content-Type', 'text/html')
      res.send('Test FinTS Server - at /cgi-bin/hbciservlet und BLZ = 12345678')
    })

    app.post('/cgi-bin/hbciservlet', function (req, res) {
      textBody(req, res, function (err, body) {
// err probably means invalid HTTP protocol or some shiz.
        if (err) {
          res.statusCode = 500
          return res.end('NO U')
        }
        res.setHeader('Content-Type', 'text/plain')
        res.send(myFINTSServer.handleIncomeMessage(body))
      })
    })

    var server = http.createServer(app)
    console.log('Listening at IP ' + ipaddr + ' on port ' + port)
    server.listen(port, ipaddr, function () {
      var addr = server.address()
      console.log('FinTS server running at:', addr.address + ':' + addr.port + '/cgi-bin/hbciservlet')
      bankenliste['12345678'].url = 'http://' + addr.address + ':' + addr.port + '/cgi-bin/hbciservlet'
      myFINTSServer.my_url = bankenliste['12345678'].url
      myFINTSServer.my_host = addr.address + ':' + addr.port
// Logger
      if (config && config.bunyan_live_logger) {
        g_log = bunyan.createLogger({
          name: 'testcases - withtestserver',
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
  })

  it('Test 1 - MsgInitDialog', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 1'))
    var old_url = client.dest_url
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) { throw error }
      client.bpd.should.have.property('vers_bpd', '78')
      client.upd.should.have.property('vers_upd', '3')
      client.sys_id.should.equal('DDDA10000000000000000000000A')
      client.konten.should.be.an.Array
      client.konten.should.have.a.lengthOf(2)
      client.konten[0].iban.should.equal('DE111234567800000001')
      should(client.konten[0].sepa_data).equal(null)
      done()
    }))
  })
  it('Test 2 - MsgInitDialog wrong user', function (done) {
    var client = new FinTSClient(12345678, 'test2', '1234', bankenliste, logger('Test 2'))
    var old_url = client.dest_url
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) {
        done()
      } else {
        throw 'Erfolg sollte nicht passieren'
      }
    }))
  })
  it('Test 3 - MsgInitDialog wrong pin', function (done) {
    var client = new FinTSClient(12345678, 'test1', '12341', bankenliste, logger('Test 3'))
    var old_url = client.dest_url
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) {
        done()
      } else {
        throw 'Erfolg sollte nicht passieren'
      }
    }))
  })
  it('Test 4 - MsgEndDialog', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 4'))
    var old_url = client.dest_url
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) {
        throw error
      } else {
        client.MsgEndDialog(mocha_catcher(done, function (error, recvMsg2) {
          if (error) { throw error }
          done()
        }))
      }
    }))
  })
  it('Test 5 - MsgRequestSepa', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 5'))
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) {
        throw error
      } else {
        client.bpd.should.have.property('vers_bpd', '78')
        client.upd.should.have.property('vers_upd', '3')
        client.sys_id.should.equal('DDDA10000000000000000000000A')
        client.konten.should.be.an.Array
        client.konten.should.have.a.lengthOf(2)
        client.konten[0].iban.should.equal('DE111234567800000001')
        should(client.konten[0].sepa_data).equal(null)
        client.MsgRequestSepa(null, mocha_catcher(done, function (error3, recvMsg3, sepa_list) {
          if (error3) { throw error3 }
          sepa_list.should.be.an.Array
          sepa_list[0].iban.should.equal('DE111234567800000001')
          sepa_list[0].bic.should.equal('GENODE00TES')
          done()
        }))
      }
    }))
  })
  it('Test 5.1 - MsgRequestSepa - failed connection', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 5.1'))
    client.MsgInitDialog(mocha_catcher(done, function (error, recvMsg, has_neu_url) {
      if (error) {
        throw error
      } else {
        client.bpd.should.have.property('vers_bpd', '78')
        client.upd.should.have.property('vers_upd', '3')
        client.sys_id.should.equal('DDDA10000000000000000000000A')
        client.konten.should.be.an.Array
        client.konten.should.have.a.lengthOf(2)
        client.konten[0].iban.should.equal('DE111234567800000001')
        should(client.konten[0].sepa_data).equal(null)
        client.bpd.url = 'http://thiswillnotworkurl'
        client.MsgRequestSepa(null, mocha_catcher(done, function (error3, recvMsg3, sepa_list) {
          should(error3).not.equal(null)
          error3.should.be.instanceOf(client.Exceptions.ConnectionFailedException)
          done()
        }))
      }
    }))
  })
  it('Test 6 - EstablishConnection', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 6'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        client.bpd.should.have.property('vers_bpd', '78')
        client.upd.should.have.property('vers_upd', '3')
        client.sys_id.should.equal('DDDA10000000000000000000000A')
        client.konten.should.be.an.Array
        client.konten.should.have.a.lengthOf(2)
        client.konten[0].iban.should.equal('DE111234567800000001')
        should(client.konten[0].sepa_data).not.equal(null)
        client.konten[0].sepa_data.iban.should.equal('DE111234567800000001')
        client.konten[0].sepa_data.bic.should.equal('GENODE00TES')
        done()
      }
    }))
  })
  it('Test 6.1 - EstablishConnection - Test Wrong User', function (done) {
    var client = new FinTSClient(12345678, 'test1_wrong_user', '1234', bankenliste, logger('Test 6.1'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        done()
      } else {
        throw 'Kein Fehler trotz falscher Benutzer!'
      }
    }))
  })
  it('Test 6.2 - EstablishConnection - Test Wrong password', function (done) {
    var client = new FinTSClient(12345678, 'test1', '123d', bankenliste, logger('Test 6.2'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        done()
      } else {
        throw 'Kein Fehler trotz falschem Passwort.'
      }
    }))
  })
  it('Test 7 - MsgGetKontoUmsaetze', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 7'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        client.konten[0].sepa_data.should.not.equal(null)
        client.MsgGetKontoUmsaetze(client.konten[0].sepa_data, null, null, mocha_catcher(done, function (error2, rMsg, data) {
          if (error2) {
            throw error2
          } else {
// Alles gut
            should(data).not.equal(null)
            data.should.be.an.Array
            should(data[0]).not.equal(null)
            should(data[1]).not.equal(null)
            data[0].schlusssaldo.value.should.equal(1223.57)
            data[1].schlusssaldo.value.should.equal(1423.6)
// Test converter
            var u_list = client.ConvertUmsatzeArrayToListofAllTransactions(data)
            should(u_list).not.equal(null)
            u_list.should.be.an.Array
            should(u_list[0]).not.be.undefined
            should(u_list[1]).not.be.undefined
            should(u_list[2]).not.be.undefined
            should(u_list[3]).be.undefined
            u_list[0].value.should.equal(182.34)
            u_list[1].value.should.equal(100.03)
            u_list[2].value.should.equal(100.00)
// Testcase erweitern
            done()
          }
        }))
      }
    }))
  })
  describe('mit Aufsetzpunkt', function () {
    before(function () {
      myFINTSServer.hikas_2_mode = true
    })
    it('Test 7.1 - MsgGetKontoUmsaetze - mit Aufsetzpunkt', function (done) {
      var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 7.1'))
      client.EstablishConnection(mocha_catcher(done, function (error) {
        if (error) {
          throw error
        } else {
          client.konten[0].sepa_data.should.not.equal(null)
          client.MsgGetKontoUmsaetze(client.konten[0].sepa_data, null, null, mocha_catcher(done, function (error2, rMsg, data) {
            if (error2) {
              throw error2
            } else {
// Alles gut
              should(data).not.equal(null)
              data.should.be.an.Array
              should(data[0]).not.equal(null)
              should(data[1]).not.equal(null)
              data[0].schlusssaldo.value.should.equal(1223.57)
              data[1].schlusssaldo.value.should.equal(1423.6)
// Testcase erweitern
              done()
            }
          }))
        }
      }))
    })
    after(function () {
      myFINTSServer.hikas_2_mode = false
    })
  })
  it('Test 8 - MsgGetSaldo', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 8'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        client.konten[0].sepa_data.should.not.equal(null)
        client.MsgGetSaldo(client.konten[0].sepa_data, mocha_catcher(done, function (error2, rMsg, data) {
// TODO Better Test Case
          if (error2) {
            throw error2
          } else {
// Testcase erweitern
            client.MsgEndDialog(function (error, recvMsg2) {	})
            done()
          }
        }))
      }
    }))
  })
  describe('HBCI 2.2', function () {
    before(function () {
      myFINTSServer.proto_version = 220
    })
    it('Test 6.1 - EstablishConnection', function (done) {
      var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 6.1'))
      client.EstablishConnection(mocha_catcher(done, function (error) {
        if (error) {
          throw error
        } else {
          client.bpd.should.have.property('vers_bpd', '78')
          client.upd.should.have.property('vers_upd', '3')
          client.sys_id.should.equal('DDDA10000000000000000000000A')
          client.konten.should.be.an.Array
          client.konten.should.have.a.lengthOf(2)
          client.konten[0].iban.should.equal('DE111234567800000001')
          should(client.konten[0].sepa_data).not.equal(null)
          client.konten[0].sepa_data.iban.should.equal('DE111234567800000001')
          client.konten[0].sepa_data.bic.should.equal('GENODE00TES')
          done()
        }
      }))
    })
    after(function () {
      myFINTSServer.proto_version = 300
    })
  })
  it('Test 9 - MsgGetKontoUmsaetze - test series calls', function (done) {
    var client = new FinTSClient(12345678, 'test1', '1234', bankenliste, logger('Test 9'))
    client.EstablishConnection(mocha_catcher(done, function (error) {
      if (error) {
        throw error
      } else {
        var error_checked_okay = false
        client.konten[0].sepa_data.should.not.equal(null)
        client.MsgGetKontoUmsaetze(client.konten[0].sepa_data, null, null, mocha_catcher(done, function (error2, rMsg, data) {
          if (error2) {
            throw error2
          } else {
// Alles gut
            should(data).not.equal(null)
            data.should.be.an.Array
            should(data[0]).not.equal(null)
            should(data[1]).not.equal(null)
            data[0].schlusssaldo.value.should.equal(1223.57)
            data[1].schlusssaldo.value.should.equal(1423.6)

            should(error_checked_okay).be.ok
            done()
          }
        }))
// das ist der eigentliche Test
        try {
          client.MsgGetKontoUmsaetze(client.konten[0].sepa_data, null, null, mocha_catcher(done, function (error2, rMsg, data) {}))
        } catch (error_to_check) {
          should(error_to_check).not.equal(null)
          error_to_check.should.be.instanceOf(client.Exceptions.OutofSequenceMessageException)
          error_checked_okay = true
        }
      }
    }))
  })
  after(function (done) {
    setTimeout(function () { done() }, 1000)
  })
})
