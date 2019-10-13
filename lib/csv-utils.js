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
    const split = file.split('\n', 4); //TODO: inefficient AF
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
          'memo',
          'taxable', //TEMP!
          // ## missing
          // 'txid'
        ],
        transform: (row) => {
          // TODO: Dynamic fiat
          row.fiat = 'USD';
          row.direction = dirMap[row.direction];
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
  },
  // function kraken_ledger(file) {
  //   const len = Buffer.byteLength(file.substr(0, file.indexOf('\n')), 'utf-8') + 1;
  //   // TODO: Support all kraken coins
  //   if (file.startsWith('"txid","refid"'))
  //     return {
  //     };
  //   else throw new UnrecognisedFormat();
  // }
];

// (async) Parses a CSV into [transactions] acording to config
function importGeneric(fileStream, config = {}, options = {}) {
  // TODO: browserfy?
  const txs = [],
        import_id = config.name + '_' + Date.now();
  let index = 0;

  if (options.year)
    options.year = parseInt(options.year);
    options.year = [Date.parse(`1/1/${options.year}`),
                    Date.parse(`1/1/${(options.year + 1)}`) -1];

  return new Promise(resolve => {
    fileStream
      .pipe(new IgnoreBytes(config.offset || 0))
      .pipe(csv({ headers: config.headers }))
      .on('data', row => {
        if (config.transform)
          config.transform(row)

        // console.log("row ===> ", row);
        // Add unique ids
        row.import_id = import_id;
        row.import_index = index++;
        // row.taxable = true

        // Typecast
        for (const [key, typeCast] of Object.entries({
            timestamp: Date.parse,
            fiatPrice: parseFloat,
            fiatAmount: parseFloat,
            cryptoAmount: parseFloat,
            taxable: v => !v || v.toLowerCase() != 'false',
          })) {
          row[key] = typeCast(row[key]);
        }

        if (options.year) {
          if (row.timestamp < options.year[0] || row.timestamp > options.year[1]) {
            return;
          }
        }

        // Hack: calc fiatPrice if missing
        if (!row.fiatPrice && row.fiatAmount && row.cryptoAmount) {
          row.fiatPrice = row.fiatAmount / row.cryptoAmount;
          console.log("CALC FIAT PRICE", row.fiatPrice);
        }

        txs.push(row);
      })
      .on('end', () => {
        resolve(txs);
      });
  // }).then((row) => {
  //   console.log(" ----> ", row)
  });
}

// ==
async function importCSV(filename, options) {
  const file = fs.readFileSync(filename, 'utf-8');
  for (const checker of checkers) {
    try {
      const conf = checker(file);
      conf.name = checker.name;
      console.log('recognised format:', checker.name);
      const fileStream = fs.createReadStream(filename);
      return await importGeneric(fileStream, conf, options);
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
  writeCSV,
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
