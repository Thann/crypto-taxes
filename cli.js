#!/bin/env node
// Crypto-taxes cli - import, dedupe, & analize your crypto transactions!
// Takes in CSV dumps of your transactions from exchanges
// and combines them into one master-list that can be analyzed.

// USAGE:
// --import filename : CSV of transactions from a exchange
// --output filename : CSV file that stores all of your transactions
// --report strategy : How to analize your transactions: [HIFO]

const fs = require('fs');
const Config = require('bcfg');
const reports = require('./lib/reports');
const { importCSV, mergeCSV, writeCSV } = require('./lib/csv-utils');

const config = new Config('crypto-taxes', {
  alias: {
    y: 'year',
    i: 'import',
    o: 'output',
    r: 'report',
  }
});

config.load({ argv: true });

console.log({ config });

if (!config.has('output')) {
  config.inject({ output: 'MyTransactions.csv' });
}

(async () => {
  let outFile;
  if (fs.existsSync(config.str('output'))) {
    outFile = fs.readFileSync(config.str('output'), 'utf-8');
  }

  if (config.has('import')) {
    console.log('importing', config.str('import'));
    // TODO: pass a re-readable stream?
    const imported = await importCSV(config.str('import'), {
      year: config.str('year'),
    });
    // console.log("IMPORTED!", imported.BTC.buys[0]);
    if (outFile) {
      throw "not implemented!";
      //outFile = mergeCsv(await importCSV(outFile), imported);
      //// save outfile
      //writeCSV(outfile, config.str('output')); // dont await ;)
    } else {
      outFile = imported;
    }
  }

  if (config.has('report')) {
    reports[config.str('report')](outFile, 'USD');
  }
})();
