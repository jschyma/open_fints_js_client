var ParseError = require('./errors').ParseError;
var NULL = require('./NULL');

function DatenElementGruppe() {
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

module.exports = DatenElementGruppe;