//

function splitCoins(txs, fiatFilter) {
	const coins = {};
	for (row of txs) {
		// init coins
		if (!(row.coin in coins))
			coins[row.coin] = { buys: [], sells: [] }
		// only include transactions involving `fiat`
		if (fiatFilter && row.fiat != fiatFilter)
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
	//TODO:
	// let partialRemainder = 0;

	for (const sell of sells) {
		console.log(" ------ SELL:", sell.timestamp, sell.fiatPrice, sell.fiatAmount, sell.cryptoAmount)
		let partialTotal = 0;
		sell.matches = [];

		while (buyIndex < buys.length) {
			const buy = buys[buyIndex];
			if (buy._cryptoRemainder === undefined)  buy._cryptoRemainder = buy.cryptoAmount;
			console.log("   ++++ BUYS:",
				buy.timestamp,
				buy.fiatPrice,
				buy.fiatAmount,
				buy.cryptoAmount, "**",
				// partialRemainder)
				buy._cryptoRemainder != buy.cryptoAmount?'**':'')
			// console.log("        (",
			// 	buy.cryptoAmount, "+", partialRemainder, "+", partialTotal, "-", sell.cryptoAmount,
			// 	" = ", buy.cryptoAmount + partialRemainder + partialTotal - sell.cryptoAmount, ") ")
			console.log("        (",
				buy._cryptoRemainder, "+", partialTotal, "-", sell.cryptoAmount,
				" = ", buy._cryptoRemainder + partialTotal - sell.cryptoAmount, ") ")
			sell.matches.push(buy)
			partialTotal += buy.cryptoAmount;
			buy._cryptoRemainder = sell.cryptoAmount - partialTotal
			// partialRemainder = partialTotal - sell.cryptoAmount;
			if (partialTotal >= sell.cryptoAmount) {
				// partialRemainder = partialTotal - sell.cryptoAmount;
				buy._cryptoRemainder = partialTotal - sell.cryptoAmount;
				break;
			}
			// partialRemainder = 0
			buyIndex += 1;
		}
		//TODO: calculate gainz
	}
}

//TODO: implement
function calculateCostBasis(sells, buys) {
	console.log(" Calculating cost basis.. [NOT IMPLEMENTED]")
}

module.exports = {
	hifo(allTxs, fiat) {
		console.log('running hifo report:...');
		for (const [coin, txs] of Object.entries(splitCoins(allTxs, fiat))) {
			console.log(" ===========	 COIN: ", coin)
			// higest in
			txs.buys.sort((a,b) => b.fiatPrice - a.fiatPrice)
			// first out
			txs.sells.sort((a,b) => a.timestamp - b.timestamp)

			matchTrades(txs.sells, txs.buys)
			break; //debugging
		}
	}
};
