var DatenElementGruppe = require('./DatenElementGruppe')
var NULL = require('./NULL')
var ParseError = require('./errors').ParseError

function Segment() {
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

module.exports = Segment;