'use strict'
function ParseError(area, txt, pos) {
  this.t = txt
  this.toString = function () {
    return this.t
  }
}

module.exports.ParseError = ParseError;