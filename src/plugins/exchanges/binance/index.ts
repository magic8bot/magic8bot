import 'colors'

import ccxt from 'ccxt'
import path from 'path'
import _ from 'lodash'

export default (conf) => {
  let publicClientCon
  let authedClientCon
  let firstRun = true
  let allowGetMarketCall = true

  function publicClient() {
    if (!publicClientCon) publicClientCon = new ccxt.binance({ apiKey: '', secret: '' })
    return publicClientCon
  }

  function authedClient() {
    if (!authedClientCon) {
      if (!conf.binance || !conf.binance.key || conf.binance.key === 'YOUR-API-KEY') {
        throw new Error('please configure your Binance credentials in ' + path.resolve(__dirname, 'conf.js'))
      }
      authedClientCon = new ccxt.binance({ apiKey: conf.binance.key, secret: conf.binance.secret })
    }
    return authedClientCon
  }

  /**
   * Convert BNB-BTC to BNB/BTC
   *
   * @param productId BNB-BTC
   * @returns {string}
   */
  function joinProduct(productId) {
    const split = productId.split('-')
    return split[0] + '/' + split[1]
  }

  function retry(method, args, err?) {
    if (method !== 'getTrades') {
      console.error(('\nBinance API is down! unable to call ' + method + ', retrying in 20s').red)
      if (err) console.error(err)
      console.error(args.slice(0, -1))
    }
    setTimeout(() => {
      exchange[method].apply(exchange, args)
    }, 20000)
  }

  const orders = {}

  const exchange = {
    historyScan: 'forward',
    historyScanUsesTime: true,
    makerFee: 0.1,
    name: 'binance',
    takerFee: 0.1,

    getProducts() {
      return require('./products.json')
    },

    getTrades(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      let trades = []
      let maxTime = 0
      const client = publicClient()
      const args: Record<string, any> = {}
      if (opts.from) args.startTime = opts.from
      if (opts.to) args.endTime = opts.to
      if (args.startTime && !args.endTime) {
        // add 12 hours
        args.endTime = parseInt(args.startTime, 10) + 3600000
      } else if (args.endTime && !args.startTime) {
        // subtract 12 hours
        args.startTime = parseInt(args.endTime, 10) - 3600000
      }
      if (allowGetMarketCall !== true) {
        cb(null, [])
        return null
      }
      if (firstRun) {
        client
          .fetchOHLCV(joinProduct(opts.productId), args.timeframe, opts.from)
          .then((result) => {
            let lastVal = 0
            trades = result.map((trade) => {
              const buySell = parseFloat(trade[4]) > lastVal ? 'buy' : 'sell'
              lastVal = parseFloat(trade[4])
              if (Number(trade[0]) > maxTime) maxTime = Number(trade[0])
              return {
                price: parseFloat(trade[4]),
                side: buySell,
                size: parseFloat(trade[5]),
                time: trade[0],
                trade_id: trade[0] + '' + (trade[5] + '').slice(-2) + (trade[4] + '').slice(-2),
              }
            })
            cb(null, trades)
          })
          .catch((error) => {
            firstRun = false
            allowGetMarketCall = false
            setTimeout(() => {
              allowGetMarketCall = true
            }, 5000)
            console.error('[OHLCV] An error occurred', error)
            return retry('getTrades', funcArgs, error)
          })
      } else {
        client
          .fetchTrades(joinProduct(opts.productId), undefined, undefined, args)
          .then((result) => {
            const newTrades = result.map((trade) => {
              return {
                price: parseFloat(trade.price),
                side: trade.side,
                size: parseFloat(trade.amount),
                time: trade.timestamp,
                trade_id: trade.id,
              }
            })
            cb(null, newTrades)
          })
          .catch((error) => {
            console.error('An error occurred', error)
            return retry('getTrades', funcArgs)
          })
      }
    },

    getBalance(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = authedClient()
      client
        .fetchBalance()
        .then((result) => {
          const balance: Record<string, any> = { asset: 0, currency: 0 }
          Object.keys(result).forEach((key) => {
            if (key === opts.currency) {
              balance.currency = result[key].free + result[key].used
              balance.currency_hold = result[key].used
            }
            if (key === opts.asset) {
              balance.asset = result[key].free + result[key].used
              balance.asset_hold = result[key].used
            }
          })
          cb(null, balance)
        })
        .catch((error) => {
          console.error('An error occurred', error)
          return retry('getBalance', funcArgs)
        })
    },

    getQuote(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = publicClient()
      client
        .fetchTicker(joinProduct(opts.productId))
        .then((result) => {
          cb(null, { bid: result.bid, ask: result.ask })
        })
        .catch((error) => {
          console.error('An error occurred', error)
          return retry('getQuote', funcArgs)
        })
    },

    getDepth(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = publicClient()
      client
        .fetchOrderBook(joinProduct(opts.productId), { limit: opts.limit })
        .then((result) => {
          cb(null, result)
        })
        .catch((error) => {
          console.error('An error ocurred', error)
          return retry('getDepth', funcArgs)
        })
    },

    cancelOrder(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = authedClient()
      client.cancelOrder(opts.order_id, joinProduct(opts.productId)).then(
        (body) => {
          if (body && (body.message === 'Order already done' || body.message === 'order not found')) return cb()
          cb(null)
        },
        (err) => {
          // match error against string:
          // "binance {"code":-2011,"msg":"UNKNOWN_ORDER"}"

          if (err) {
            // decide if this error is allowed for a retry

            if (err.message && err.message.match(new RegExp(/-2011|UNKNOWN_ORDER/))) {
              console.error(('\ncancelOrder retry - unknown Order: ' + JSON.stringify(opts) + ' - ' + err).cyan)
            } else {
              // retry is allowed for this error

              return retry('cancelOrder', funcArgs, err)
            }
          }

          cb()
        }
      )
    },

    buy(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = authedClient()
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      opts.type = 'limit'
      const args: Record<string, any> = {}
      if (opts.order_type === 'taker') {
        delete opts.price
        delete opts.post_only
        opts.type = 'market'
      } else {
        args.timeInForce = 'GTC'
      }
      opts.side = 'buy'
      delete opts.order_type
      let order = {}
      client
        .createOrder(
          joinProduct(opts.productId),
          opts.type,
          opts.side,
          this.roundToNearest(opts.size, opts),
          opts.price,
          args
        )
        .then((result) => {
          if (result && result.message === 'Insufficient funds') {
            order = {
              reject_reason: 'balance',
              status: 'rejected',
            }
            return cb(null, order)
          }
          order = {
            created_at: new Date().getTime(),
            filled_size: '0',
            id: result ? result.id : null,
            ordertype: opts.order_type,
            post_only: !!opts.post_only,
            price: opts.price,
            size: this.roundToNearest(opts.size, opts),
            status: 'open',
          }
          orders['~' + result.id] = order
          cb(null, order)
        })
        .catch((error) => {
          console.error('An error occurred', error)

          // decide if this error is allowed for a retry:
          // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
          // {"code":-2010,"msg":"Account has insufficient balance for requested action"}

          if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
            return cb(null, {
              reject_reason: 'balance',
              status: 'rejected',
            })
          }

          return retry('buy', funcArgs)
        })
    },

    sell(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = authedClient()
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      opts.type = 'limit'
      const args: Record<string, any> = {}
      if (opts.order_type === 'taker') {
        delete opts.price
        delete opts.post_only
        opts.type = 'market'
      } else {
        args.timeInForce = 'GTC'
      }
      opts.side = 'sell'
      delete opts.order_type
      let order = {}
      client
        .createOrder(
          joinProduct(opts.productId),
          opts.type,
          opts.side,
          this.roundToNearest(opts.size, opts),
          opts.price,
          args
        )
        .then((result) => {
          if (result && result.message === 'Insufficient funds') {
            order = {
              reject_reason: 'balance',
              status: 'rejected',
            }
            return cb(null, order)
          }
          order = {
            created_at: new Date().getTime(),
            filled_size: '0',
            id: result ? result.id : null,
            ordertype: opts.order_type,
            post_only: !!opts.post_only,
            price: opts.price,
            size: this.roundToNearest(opts.size, opts),
            status: 'open',
          }
          orders['~' + result.id] = order
          cb(null, order)
        })
        .catch((error) => {
          console.error('An error occurred', error)

          // decide if this error is allowed for a retry:
          // {"code":-1013,"msg":"Filter failure: MIN_NOTIONAL"}
          // {"code":-2010,"msg":"Account has insufficient balance for requested action"}

          if (error.message.match(new RegExp(/-1013|MIN_NOTIONAL|-2010/))) {
            return cb(null, {
              reject_reason: 'balance',
              status: 'rejected',
            })
          }

          return retry('sell', funcArgs)
        })
    },

    roundToNearest(numToRound, opts) {
      let numToRoundTo = _.find(this.getProducts(), {
        asset: opts.productId.split('-')[0],
        currency: opts.productId.split('-')[1],
        // @ts-ignore
      }).min_size
      numToRoundTo = 1 / numToRoundTo

      return Math.floor(numToRound * numToRoundTo) / numToRoundTo
    },

    getOrder(opts, cb) {
      const funcArgs = [].slice.call(arguments)
      const client = authedClient()
      const order = orders['~' + opts.order_id]
      client.fetchOrder(opts.order_id, joinProduct(opts.productId)).then(
        (body) => {
          if (body.status !== 'open' && body.status !== 'canceled') {
            order.status = 'done'
            order.done_at = new Date().getTime()
            order.filled_size = parseFloat(body.amount) - parseFloat(body.remaining)
            return cb(null, order)
          }
          cb(null, order)
        },
        (err) => {
          return retry('getOrder', funcArgs, err)
        }
      )
    },

    getCursor(trade) {
      return trade.time || trade
    },
  }
  return exchange
}
