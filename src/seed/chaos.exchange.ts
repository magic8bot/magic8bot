import { OrderNotFound, InsufficientFunds } from 'ccxt'
import { time } from '../util'
import { MongoClient, Db, Collection } from 'mongodb'

interface Params {
  startTime: number
  endTime: number
}

interface Balance {
  name: string
  amount: number
}

interface Trade {
  id: number
  amount: number
  timestamp: number
  datetime: string
  price: number
  side: 'bid' | 'ask'
  symbol: string
}

interface Order {
  id: number
  timestamp: number
  symbol: string
  status: 'open' | 'partial' | 'canceled' | 'closed'
  amount: number
  filled: number
  remaining: number
  price: number
  side: 'bid' | 'ask'
  type: string
}

export class ChaosXcg {
  public symbols = ['BTC/USD', 'ETH/USD', 'ETH/BTC']

  private connection: Db

  private trades: Map<string, Trade> = new Map()
  private orders: Map<number, Order> = new Map()
  private balances: Map<string, number> = new Map()

  private balanceCollection: Collection<Balance>
  private tradeCollection: Collection<Trade>
  private orderCollection: Collection<Order>

  public async connect({ username = '', password = '', authMechanism = null, host = 'localhost', port = 27017 }) {
    const conStr = this.makeConnectionString(username, password, host, port, authMechanism)

    const mongo = await MongoClient.connect(
      conStr,
      { useNewUrlParser: true }
    )

    this.connection = mongo.db('chaosdb')

    this.balanceCollection = this.connection.collection('balances')
    this.balanceCollection.createIndex({ symbol: 1 })

    this.tradeCollection = this.connection.collection('trades')
    this.tradeCollection.createIndex({ timestamp: 1, symbol: 1 })

    this.orderCollection = this.connection.collection('orders')
    this.orderCollection.createIndex({ id: 1 })
    this.orderCollection.createIndex({ status: 1 })

    await this.prefill()
    await this.getOpenOrders()
  }

  public fetchTrades(symbol: string, a, b, params: Params) {
    return this.getTrades(symbol, params.startTime, params.endTime)
  }

  public async fetchBalance() {
    return (await this.balanceCollection.find({}, { projection: { _id: 0 } }).toArray()).reduce((acc, curr) => {
      acc[curr.name] = { total: curr.amount }
      return acc
    }, {})
  }

  public fetchOrderBook(symbol: string) {
    if (!this.trades.has(symbol)) this.makeFakeTrade(symbol, 0)
    const lastTrade = this.trades.get(symbol)
    const largeSpread = this.rand(0, 3) === 3
    const spread = largeSpread ? this.rand(1, 30) / 100 : this.rand(1, 4) / 100

    const ask = lastTrade.side === 'ask' ? lastTrade.price : lastTrade.price + spread
    const bid = lastTrade.side === 'bid' ? lastTrade.price - spread : lastTrade.price

    return {
      asks: [[ask, 3]],
      bids: [[bid, 3]],
    }
  }

  public async createOrder(symbol: string, type: string, side: 'bid' | 'ask', amount: number, price: number) {
    const timestamp = new Date().getTime()
    await this.adjustBalance(symbol, price, amount, side)

    const openOrders = this.orders
    const id = !openOrders.size ? 1 : openOrders.size
    const status = 'open'
    const filled = 0
    const remaining = amount
    const order: Order = { id, timestamp, symbol, status, amount, filled, remaining, price, side, type }

    this.orders.set(id, order)
    await this.orderCollection.save({ ...order })

    return order
  }

  public async fetchOrder(orderId: string) {
    const order = this.orders.get(Number(orderId))
    if (!order) return null
    if (order.status === 'canceled' || order.status === 'closed') return order

    await this.checkOrderCompletion(order)
    return order
  }

  public async cancelOrder(orderId: string) {
    const order = this.orders.get(Number(orderId))
    if (!order) return null
    if (order.status === 'canceled' || order.status === 'closed') throw new OrderNotFound('Nah.')

    await this.checkOrderCompletion(order)

    const updatedOrder = this.orders.get(Number(orderId))
    if (updatedOrder.status === 'closed') throw new OrderNotFound('Nah.')

    const [a, c] = updatedOrder.symbol.split('/')
    if (updatedOrder.side === 'bid') {
      const cost = updatedOrder.remaining * order.price
      const currency = this.balances.get(c)
      this.balances.set(c, currency + cost)
    } else {
      const asset = this.balances.get(a)

      this.balances.set(a, asset + updatedOrder.remaining)
    }

    const canceledOrder: Order = { ...updatedOrder, status: 'canceled' }
    this.orders.set(order.id, canceledOrder)

    // @ts-ignore
    delete canceledOrder._id

    await this.orderCollection.update({ id: canceledOrder.id }, canceledOrder)

    return canceledOrder
  }

  public priceToPrecision(symbol: string, amount: number) {
    return amount
  }

  public market(symbol: string) {
    return {
      limits: {
        amount: { max: 50, min: 0.001 },
        price: { max: 50, min: 0.001 },
        cost: { max: 50, min: 0.001 },
      },
    }
  }

  private async adjustBalance(symbol: string, price: number, amount: number, side: 'bid' | 'ask') {
    const [a, c] = symbol.split('/')
    if (side === 'bid') {
      const cost = price * amount
      const currency = this.balances.get(c)
      if (cost > currency) throw new InsufficientFunds('You poor')

      this.balances.set(c, currency - cost)
      await this.balanceCollection.update({ name: a }, { amount: currency - cost })
    } else {
      const asset = this.balances.get(a)
      if (amount > asset) throw new InsufficientFunds('You poor')

      this.balances.set(a, asset - amount)
      await this.balanceCollection.update({ name: c }, { amount: asset - amount })
    }
  }

  private async checkOrderCompletion(order: Order) {
    const lastTrade = this.trades.get(order.symbol)
    if (order.side === 'ask' && lastTrade.price < order.price) return
    if (order.side === 'bid' && lastTrade.price > order.price) return

    const filled = lastTrade.amount > order.amount ? order.amount : order.filled + lastTrade.amount
    const status = order.filled < order.amount ? 'partial' : 'closed'
    const remaining = order.amount - filled

    if (filled !== order.filled) {
      const [a, c] = order.symbol.split('/')

      if (order.side === 'bid') {
        const amount = filled - order.filled
        this.balances.set(a, amount)
        await this.balanceCollection.update({ name: a }, { amount })
      } else {
        const amount = order.price * (filled - order.filled)
        this.balances.set(c, amount)
        await this.balanceCollection.update({ name: c }, { amount })
      }
    }

    const updatedOrder: Order = { ...order, filled, remaining, status }

    // @ts-ignore
    delete updatedOrder._id

    await this.orderCollection.update({ id: updatedOrder.id }, updatedOrder)

    this.orders.set(order.id, updatedOrder)
  }

  private async getTrades(symbol: string, startTime: number, endTime: number) {
    const trades = await this.tradeCollection.find({ symbol, $and: [{ timestamp: { $gt: startTime } }, { timestamp: { $lt: endTime } }] }, { projection: { _id: 0 } }).toArray()
    if (trades && trades.length) return trades

    const timerange = endTime - startTime
    const addTrades = this.rand(0, 2) === 2
    const isLargeVolume = this.rand(0, 3) === 3
    const newTradesCount = addTrades ? (!isLargeVolume ? this.rand(0, 1) : this.rand(2, 8)) : 0

    return this.makeFakeTrades(symbol, newTradesCount, timerange, startTime)
  }

  private async makeFakeTrades(symbol: string, amountOfTrades: number, timerange: number, startTime: number) {
    if (amountOfTrades === 0) return []
    const trades = [...Array(amountOfTrades)].fill(null).map((v, i) => this.makeFakeTrade(symbol, startTime + (timerange / amountOfTrades) * i))
    await this.tradeCollection.insertMany(trades)
    return trades
  }

  private makeFakeTrade(symbol: string, timestamp: number) {
    const lastTrade = this.trades.get(symbol)

    const amount = this.rand(1000, 1000000) / 100000
    const datetime = new Date(timestamp).toISOString()
    const id = lastTrade ? lastTrade.id + 1 : 0

    const isBid = !lastTrade ? this.rand(0, 1) === 1 : lastTrade.side === 'bid' ? this.rand(0, 1) === 1 : this.rand(0, 2) === 2
    const lastPrice = lastTrade ? lastTrade.price : this.rand(50000, 600000) / 100
    const priceJump = this.rand(0, 3) === 3 ? this.rand(3, 10) : this.rand(2, 3)
    const down = this.rand(lastPrice * 100 - priceJump, lastPrice * 100 - 1) / 100
    const up = this.rand(lastPrice * 100 + 1, lastPrice * 100 + priceJump) / 100

    const price = Number((isBid ? down : up).toFixed(2))
    const side = isBid ? 'bid' : 'ask'

    const trade: Trade = { id, amount, timestamp, datetime, price, side, symbol }
    this.trades.set(symbol, trade)
    return this.trades.get(symbol)
  }

  private rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  private makeConnectionString(username: string, password: string, host: string, port: number, authMechanism: string) {
    const uname = encodeURIComponent(username)
    const pword = password ? encodeURIComponent(password) : ''
    const authStr = !username ? '' : !pword ? `${uname}@` : `${uname}:${pword}@`
    const baseStr = `mongodb://${authStr}${host}:${port}`

    return authMechanism ? `${baseStr}?authMechanism=${authMechanism}` : baseStr
  }

  private async prefill() {
    await Promise.all([].concat(this.fillTrades()).concat(this.fillBalances()))
  }

  private fillTrades() {
    const now = new Date().getTime()

    return this.symbols.map(async (symbol) => {
      const lastTrade = await this.getLastTrade(symbol)
      let currentTime = !lastTrade ? time(now).sub.h(7) : lastTrade.timestamp
      const tradesPerHour = this.rand(3000, 6000)

      while (currentTime < now) {
        const end = time(currentTime).add.h(1)
        const endTime = end > now ? now : end
        const oneHour = time(0).add.h(1)
        const range = endTime - currentTime

        const newTradesAmount = Math.floor((range / oneHour) * tradesPerHour)

        await this.makeFakeTrades(symbol, newTradesAmount, endTime - currentTime, currentTime)

        currentTime = endTime
      }
    })
  }

  private async getLastTrade(symbol: string) {
    const lastTrades = await this.tradeCollection
      .find({ symbol }, { projection: { _id: 0 } })
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray()

    if (!lastTrades || !lastTrades.length) return false
    const lastTrade = lastTrades.pop()
    this.trades.set(symbol, lastTrade)
    return lastTrade
  }

  private fillBalances() {
    const balances = [{ name: 'BTC', amount: 1.2 }, { name: 'USD', amount: 3000 }, { name: 'ETH', amount: 5.7 }]

    return balances.map(async ({ name, amount }) => {
      const balance = await this.getBalance(name)
      if (!balance) await this.balanceCollection.save({ name, amount })
    })
  }

  private async getBalance(name: string) {
    const balance = await this.balanceCollection.find({ name }, { projection: { _id: 0 } }).toArray()
    if (!balance || !balance.length) return false
    return balance.pop()
  }

  private async getOpenOrders() {
    const orders = await this.orderCollection.find({ $or: [{ status: 'open' }, { status: 'partial' }] }, { projection: { _id: 0 } }).toArray()
    if (!orders || !orders.length) return
    orders.forEach((order) => this.orders.set(order.id, order))
  }
}
