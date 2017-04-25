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

module.exports = OrderHelperChain;