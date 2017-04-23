var Segment = require('./Segment')
var DatenElementGruppe = require('./DatenElementGruppe')
var ByteVal = require('./ByteVal')

var Helper = new function () {
  this.checkMsgsWithBelongToForId = function (msg, bez, id) {
    var array = msg.selectSegByNameAndBelongTo('HIRMS', bez)
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

module.exports = Helper;