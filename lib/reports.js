//

function splitCoins(txs, fiatFilter) {
	const coins = {};
	for (row of txs) {
		// init coins
		if (!(row.coin in coins))
			coins[row.coin] = { buys: [], sells: [] }
		// only include transactions involving `fiat`
		if (fiatFilter && row.fiat != fiatFilter || !row.taxable)
			continue;
		// split into buys & sells
		if (row.direction == 'sell') {
			coins[row.coin].sells.push(row);
		} else if (row.direction == 'buy') {
			coins[row.coin].buys.push(row);
		} else {
			console.warn("WARNING: skipping row: not buy or sell:", row);
		}
	}
	return coins;
}

function matchTrades(sells, buys) {
	let buyIndex = 0;
	let fiatSold = 0
	let fiatBought = 0
	////
	let ghettoSold = 0
	let ghettoBought = 0
	let ghettoCryptoSold = 0
	let ghettoCryptoBought = 0
	////
	let partialRemainder = 0;

	for (const sell of sells) {
		console.log(" ------ SELL:", sell.timestamp, '@'+sell.fiatPrice, '$'+sell.fiatAmount, '₿'+sell.cryptoAmount, '    ::', sell.memo)
		let partialTotal = 0;
		let fiatBuys = 0;
		sell.matches = [];

		while (buyIndex < buys.length) {
			const buy = buys[buyIndex];
			if (partialRemainder === 0)  partialRemainder = buy.cryptoAmount;
			console.log("   ++++ BUYS:",
				buy.timestamp,
				'@'+buy.fiatPrice,
				'$'+buy.fiatAmount,
				'₿'+buy.cryptoAmount, "**",
				partialRemainder)
			console.log("        (",
				partialRemainder, "+", partialTotal, "-", sell.cryptoAmount,
				" = ", partialRemainder + partialTotal - sell.cryptoAmount, ") ")

			sell.matches.push(buy);
			if (partialTotal + partialRemainder >= sell.cryptoAmount) {
				partialRemainder += partialTotal - sell.cryptoAmount;
				//TODO: problem
				// fiatBuys += (buy.cryptoAmount - partialRemainder) * buy.fiatPrice;
				// console.log("        %", (buy.cryptoAmount - partialRemainder) * buy.fiatPrice, "  --  (", buy.cryptoAmount, '-', partialRemainder, '=', buy.cryptoAmount - partialRemainder, ') * ',buy.fiatPrice)
				fiatBuys += (sell.cryptoAmount - partialTotal) * buy.fiatPrice;
				console.log("        %!", (sell.cryptoAmount - partialTotal) * buy.fiatPrice, "  --  (", sell.cryptoAmount, '-', partialTotal, '=', sell.cryptoAmount - partialTotal, ') * ',buy.fiatPrice)
				break;
			}
			partialTotal += partialRemainder;
			// console.log("        %", fiatBuys, '+', buy.fiatAmount, '=', fiatBuys + buy.fiatAmount)
			console.log("        %", partialRemainder, '*', buy.fiatPrice, '=', partialRemainder * buy.fiatPrice)
			fiatBuys += partialRemainder * buy.fiatPrice
			ghettoBought += buy.fiatAmount
			ghettoCryptoBought += buy.cryptoAmount
			partialRemainder = 0;
			buyIndex += 1;
		}
		ghettoSold += sell.fiatAmount
		ghettoCryptoSold += sell.cryptoAmount
		fiatGainz = sell.fiatAmount - fiatBuys;
		fiatSold += sell.fiatAmount;
		fiatBought += fiatBuys;
		console.log("          ++ FiatGaiz:", fiatGainz, " ~~~ ", sell.fiatAmount, '-', fiatBuys, '=',  sell.fiatAmount - fiatBuys, )
	}
	return {fiatSold, fiatBought, ghetto:{ghettoSold, ghettoBought, ghettoCryptoSold, ghettoCryptoBought}}
}

module.exports = {
	hifo(allTxs, fiat) {
		console.log('running hifo report:...');
		for (const [coin, txs] of Object.entries(splitCoins(allTxs, fiat))) {
			console.log(" ===========	 COIN: ", coin)
			// higest in
			txs.buys.sort((a,b) => b.fiatPrice - a.fiatPrice);
			// first out
			txs.sells.sort((a,b) => a.timestamp - b.timestamp);

			const stats =  matchTrades(txs.sells, txs.buys);
			console.log(" ~~~~~~~~~~~~~~~~~~~")
			console.log("   Coin:", coin, stats)
			console.log("   Gainz:", stats.fiatSold - stats.fiatBought)
			console.log(" ~~~~~~~~~~~~~~~~~~~")
		}
	}
};
