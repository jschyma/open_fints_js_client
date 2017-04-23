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

function Parser(in_txt) {
  var me = this

  me.data = in_txt
  me.cur_pos = 0
  me.marker = {}

  me.clearMarker = function () {
    me.marker = {}
  }

  me.setMarker = function (mark, pos) {
    me.marker[mark] = pos
  }

  me.setMarkerWithCurrentPos = function (mark) {
    me.setMarker(mark, me.cur_pos)
  }

  me.setPosBackToMarker = function (mark) {
    me.cur_pos = me.marker[mark]
  }

  me.getCurrentPos = function () {
    return this.cur_pos
  }

  me.setCurrentPos = function (pos) {
    me.cur_pos = pos
  }

  me.getCurrentChar = function () {
    return me.data[me.cur_pos]
  }

  me.hasNext = function () {
    if (me.cur_pos < me.data.length) {
      return true
    } else {
      return false
    }
  }

  me.nextPos = function () {
    if (me.cur_pos < me.data.length) {
      me.cur_pos++
      return true
    } else {
      return false
    }
  }

  me.getTextFromMarkerToCurrentPos = function (mark) {
    return me.getTextFromPostoPos(me.marker[mark], me.cur_pos)
  }

  me.getTextFromPostoPos = function (pos1, pos2) {
    return me.data.substr(pos1, pos2 - pos1)
  }

  me.findNextValidChar = function (valid_chars) {
    var i = 0
    for (i = me.cur_pos; i < me.data.length; i++) {
      if (valid_chars.indexOf(me.data[i]) != -1) {
        return i
      }
    }
    return -1
  }

  me.gotoNextValidChar = function (valid_chars) {
    var pos = me.findNextValidChar(valid_chars)
    if (pos == -1) {
      me.cur_pos = me.data.length
      return false
    } else {
      me.cur_pos = pos
      return true
    }
  }

  // This goes to the first char of the string
  me.findNextValidString = function (array_of_string) {
    var orig_pos = me.cur_pos
    var valid_chars = ''

    for (var i = 0; i != array_of_string.length; i++) {
      valid_chars += array_of_string[i].charAt(0)
    }

    var pos = me.cur_pos
    do {
      pos = me.findNextValidChar(valid_chars)
      if (pos != -1) {
        for (var i = 0; i != array_of_string.length; i++) {
          if (array_of_string[i].charAt(0) == me.data[pos]) {
            // prüfen ob voll passt
            var comp_str = me.data.substr(pos, array_of_string[i].length)
            if (comp_str == array_of_string[i]) {
              // fertig
              me.cur_pos = orig_pos
              return pos
            }
          }
        }
        me.cur_pos = pos + 1
      }
    } while (pos != -1)

    me.cur_pos = orig_pos
    return pos
  }

  me.gotoNextValidString = function (array_of_string) {
    var pos = me.findNextValidString(array_of_string)
    if (pos == -1) {
      me.cur_pos = me.data.length
      return false
    } else {
      me.cur_pos = pos
      return true
    }
  }

  me.gotoNextValidCharButIgnoreWith = function (valid_chars, demask) {
    while (true) {
      var pos = me.findNextValidChar(valid_chars)
      if (pos == -1) {
        me.cur_pos = me.data.length
        return false
      } else if (pos == 0) {
        me.cur_pos = pos
        return true
      } else if (demask.indexOf(me.data[pos - 1]) != -1) {
        if ((pos + 1) < me.data.length) {
          me.cur_pos = pos + 1
          // retry
        } else {
          me.cur_pos = pos
          return false
        }
      } else {
        me.cur_pos = pos
        return true
      }
    }
  }
}

module.exports = Parser
