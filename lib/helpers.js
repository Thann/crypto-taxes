// random helpers

const { Transform } = require('stream');

// Ignores the first X bytes of a stream
class IgnoreBytes extends Transform {
  constructor(bytesToConsume) {
    super();
    this._bytesToConsume = bytesToConsume;
  }
  _transform(data, enc, cb) {
    if (this._bytesToConsume) {
      this.push(data.slice(this._bytesToConsume));
      this._bytesToConsume = false;
    } else {
      this.push(data);
    }
    cb && cb();
  }
}

class UnrecognisedFormat extends Error {
  constructor(msg) {
    super(msg || 'format not recognised.');
    this.name = 'UnrecognisedFormat';
  }
}

module.exports = {
  IgnoreBytes,
  UnrecognisedFormat
};
