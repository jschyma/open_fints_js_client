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
var Order = require('./Order')
var Exceptions = require('./errors')
var OrderHelperChain = require('./OrderHelperChain')




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
