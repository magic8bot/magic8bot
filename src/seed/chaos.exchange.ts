interface Params {
  startTime: number
  endTime: number
}

export class ChaosXcg {
  private lastFakeTrade = null

  public fetchTrades(symbol: string, a, b, params: Params) {
    const amountOfTrades = this.rand(3000, 6000)
    const timerange = params.endTime - params.startTime

    return this.makeFakeTrades(symbol, amountOfTrades, timerange, params.startTime)
  }

  // public fetchBalance() {}

  // public fetchOrderBook(symbol: string) {}

  // public createOrder(symbol: string, type: string, side: string, amount: number, price: number) {}

  // public fetchOrder(orderId: string) {}

  // public cancelOrder(orderId: string) {}

  // public priceToPrecision(symbol: string, amount: number) {}

  public market(symbol: string) {
    return {
      amount: 1,
      price: 1,
      cost: 1,
    }
  }

  private makeFakeTrades(symbol: string, amountOfTrades: number, timerange: number, startTime: number) {
    return [...Array(amountOfTrades)].fill(null).map((v, i) => this.makeFakeTrade(symbol, startTime + (timerange / amountOfTrades) * i))
  }

  private makeFakeTrade(symbol: string, timestamp: number) {
    const amount = this.rand(1000, 1000000) / 100000
    const datetime = new Date(timestamp)
    const id = this.lastFakeTrade ? this.lastFakeTrade.id + 1 : 0

    const isBid = !this.lastFakeTrade ? this.rand(0, 1) === 1 : this.lastFakeTrade.side === 'bid' ? this.rand(0, 1) === 1 : this.rand(0, 2) === 2
    const lastPrice = this.lastFakeTrade ? this.lastFakeTrade.price : this.rand(50000, 600000) / 100
    const priceJump = this.rand(0, 3) === 3 ? this.rand(0, 200) : this.rand(0, 50)
    const down = this.rand(lastPrice * 100 - priceJump, lastPrice * 100) / 100
    const up = this.rand(lastPrice * 100, lastPrice * 100 + priceJump) / 100

    const price = Number((isBid ? down : up).toFixed(2))
    const side = isBid ? 'bid' : 'ask'

    this.lastFakeTrade = { id, amount, timestamp, datetime, price, side, symbol }
    return this.lastFakeTrade
  }

  private rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
}

const chaosXcg = new ChaosXcg()

const trades = chaosXcg.fetchTrades('test', null, null, { startTime: 1534190400000, endTime: 1534194000000 })
console.log(trades)
