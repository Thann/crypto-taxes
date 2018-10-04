// Imports CSVs into a common format

const fs = require('fs'); // TODO: browserfy?
const csv = require('csv-parser');
const { Transform } = require('stream');


// == Functions that analize a csv into a config for importGeneric
const checkers = [
  function generic(file) {
    if (!file.startsWith('timestamp,direction'))
      throw new UnrecognisedFormat();
  },
  function coinbase(file) {
    const split = file.split('\n', 4);
    const s2 = split[3].split(',', 6);
    const len = Buffer.byteLength(split.join('\n'), 'utf-8') + 1;
    const dirMap = {
      Send:    'sell',
      Sell:    'sell',
      Buy:     'buy',
      Receive: 'buy',
    }
    if (s2[5] === 'USD Amount Transacted (Inclusive of Coinbase Fees)')
      return {
        offset: len,
        headers: [
          'timestamp',
          'direction',
          'coin',
          'cryptoAmount',
          'fiatPrice',
          'fiatAmount',
          'cryptoAddress',
          'memo'
        ],
        transform: (row) => {
          // TODO: Dynamic fiat
          row.fiat = 'USD';
          row.direction = dirMap[row.direction]
        }
      };
    else throw new UnrecognisedFormat();
  },
  function kraken_trades(file) {
    const len = Buffer.byteLength(file.substr(0, file.indexOf('\n')), 'utf-8') + 1;
    // TODO: Support all kraken coins
    coinMap = {
      'XXBT': 'BTC',
      'BCH': 'BCH',
    }
    fiatMap = {
      'ZUSD': 'USD',
    }
    if (file.startsWith('"txid","ordertxid"'))
      return {
        offset: len,
        headers: [
          'txid',
          null,           // 'ordertxid',
          'pair',         // nonstandard!
          'timestamp',    // 'time'
          'direction',    // 'type'
          null,           // 'ordertype',
          'fiatPrice',    // 'price'
          'fiatAmount',   // 'cost'
          null,           // 'fee'
          'cryptoAmount', // 'vol'
          // 'margin',    'misc',    'ledgers', 'postxid',
          // 'posstatus', 'cprice',  'ccost',   'cfee',
          // 'cvol',      'cmargin', 'net',     'trades',
          // ## missing
          // 'cryptoAddress', 'memo'
        ],
        transform: row => {
          for (const [a,b] of Object.entries(coinMap)) {
            if (row.pair.startsWith(a))
              row.coin = b
          }
          for (const [a,b] of Object.entries(fiatMap)) {
            if (row.pair.endsWith(a))
              row.fiat = b
          }
        }
      };
    else throw new UnrecognisedFormat();
  }
];

// (async) Parses a CSV into {buys,sells} acording to config
function importGeneric(fileStream, config = {}) {
  // TODO: browserfy?
  const buys = [],
    sells = [];

  return new Promise(resolve => {
    fileStream
      .pipe(new IgnoreBytes(config.offset || 0))
      .pipe(csv({ headers: config.headers }))
      .on('data', row => {
        if (config.transform)
          config.transform(row)
        // console.log("row ===> ", row);
        if (row.direction == 'sell') {
          sells.push(row);
        } else if (row.direction == 'buy') {
          buys.push(row);
        } else {
          console.warn("WARNING: skipping row: not buy or sell:", row);
        }
      })
      .on('end', () => {
        resolve({ buys, sells });
      });
  });
}

// ==
async function importCSV(filename) {
  const file = fs.readFileSync(filename, 'utf-8');
  for (const checker of checkers) {
    try {
      const conf = checker(file);
      console.log('recognised format:', checker.name);
      const fileStream = fs.createReadStream(filename);
      return await importGeneric(fileStream, conf);
    } catch(e) {
      if (e instanceof UnrecognisedFormat) {
        console.log(checker.name, ':', e.message);
      } else {
        console.error('Error running checker', checker.name);
        throw e;
      }
    }
  }

  throw new UnrecognisedFormat('not able to recognize csv format!');
}

// == Merges and dedupes imports in into a common csv format
function mergeCSV(outFile, imported) {
  //TODO: get passed a readStream instead?
  console.log('merging files...');
}

// == Writes ins/outs to a file
async function writeCSV(txs, filename) {
  //TODO: get passed a readStream instead?
  //TODO: implement!
  console.log('writing csv...');
}

module.exports = {
  importCSV,
  mergeCSV,
}


// == Helpers ==

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
