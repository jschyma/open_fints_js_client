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
var Parser = require('./Parser')
var ParseError =  require('./errors').ParseError

var Konto = require('./Konto')
var NULL = require('./NULL')
var ByteVal = require('./ByteVal')
var DatenElementGruppe = require('./DatenElementGruppe')
var Segment = require('./Segment')
var Helper = require('./Helper')
var Nachricht = require('./Nachricht')


var Exceptions = require('./errors')

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
