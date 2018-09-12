// Imports CSVs into a common format

const fs = require('fs'); // TODO: browserfy?
const csv = require('csv-parser');
const { IgnoreBytes, UnrecognisedFormat } = require('./helpers');

// == Functions that analize a csv into a config for importGeneric
const checkers = [
  function generic(file) {
    if (!file.startsWith('timestamp,direction'))
      throw new UnrecognisedFormat();
  },
  function coinbase(file) {
    const split = file.split('\n', 4);
    const s2 = split[3].split(',', 6);
    let len = 0;
    for (const c of split) {
      len += Buffer.byteLength(c, 'utf-8') + 1;
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
        ]
      };
    else throw new UnrecognisedFormat();
  },
  function kraken(file) {
    throw new UnrecognisedFormat('not implemented! (yet)');
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
        // console.log("row ===> ", row);
        if (row.direction == 'Send' || row.direction == 'Sell') {
          sells.push(row);
        } else {
          buys.push(row);
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

module.exports = importCSV;
