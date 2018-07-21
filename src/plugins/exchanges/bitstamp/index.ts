import 'colors'

import Bitstamp from 'bitstamp'
import path from 'path'
import Pusher from 'pusher-js/node'
import n from 'numbro'
import util from 'util'
import EventEmitter from 'events'

const args = process.argv

const wsOpts = {
  encrypted: true,
  pairOk: false,
  currencyPair: 'btcusd',
  trades: { evType: 'trade', channel: 'live_trades' },
  quotes: { evType: 'data', channel: 'order_book' },
}

// The use of bitstamp-ws  requires that
// Knowledge of the asset/currency pair
// before the first call for a trade
// As magic8bot dont returns the currency pair
// before the first trade is requested
// it has been neccessary to get it from
// t:he command line arguments
args.forEach(function(value) {
  if (value.toLowerCase().match(/bitstamp/)) {
    const p = value.split('.')[1]
    const prod = p.split('-')[0] + p.split('-')[1]
    const pair = prod.toLowerCase()
    if (!wsOpts.pairOk) {
      if (pair !== 'btcusd') {
        wsOpts.trades.channel = 'live_trades_' + pair
        wsOpts.quotes.channel = 'order_book_' + pair
      }
      wsOpts.currencyPair = pair
      wsOpts.pairOk = true
    }
  }
})

function joinProduct(productId) {
  return productId.split('-')[0] + productId.split('-')[1]
}

export default (conf) => {
  function authedClient() {
    if (conf.bitstamp.key && conf.bitstamp.key !== 'YOUR-API-KEY') {
      return new Bitstamp(conf.bitstamp.key, conf.bitstamp.secret, conf.bitstamp.client_id)
    }
    throw new Error('\nPlease configure your Bitstamp credentials in ' + path.resolve(__dirname, 'conf.js'))
  }

  // -----------------------------------------------------
  //  The websocket functions
  //
  const BITSTAMP_PUSHER_KEY = 'de504dc5763aeef9ff52'

  const Bitstamp_WS = function(opts) {
    if (opts) {
      this.opts = opts
    } else {
      this.opts = {
        encrypted: true,
      }
    }

    this.client = new Pusher(BITSTAMP_PUSHER_KEY, {
      encrypted: this.opts.encrypted,
      // encrypted: true
    })

    // bitstamp publishes all data over just 2 channels
    // make sure we only subscribe to each channel once
    this.bound = {
      trade: false,
      data: false,
    }

    this.subscribe()
  }

  Bitstamp.prototype.tradeDaily = function(direction, market, amount, price, callback) {
    this._post(market, direction, callback, {
      amount,
      price,
      daily_order: true,
    })
  }

  Bitstamp.prototype.tradeMarket = function(direction, market, amount, callback) {
    this._post(market, direction + '/market', callback, {
      amount,
    })
  }

  util.inherits(Bitstamp_WS, EventEmitter)

  Bitstamp_WS.prototype.subscribe = function() {
    if (wsOpts.pairOk) {
      this.client.subscribe(wsOpts.trades.channel)
      this.client.bind(wsOpts.trades.evType, this.broadcast(wsOpts.trades.evType))
      this.client.subscribe(wsOpts.quotes.channel)
      this.client.bind(wsOpts.quotes.evType, this.broadcast(wsOpts.quotes.evType))
    }
  }

  Bitstamp_WS.prototype.broadcast = function(name) {
    if (this.bound[name]) return function noop() {}
    this.bound[name] = true
    return function(e) {
      this.emit(name, e)
    }.bind(this)
  }
  // Placeholders
  let wsquotes = { bid: 0, ask: 0 }
  const wstrades: Record<string, any>[] = [
    {
      trade_id: 0,
      time: 1000,
      size: 0,
      price: 0,
      side: '',
    },
  ]

  const wsTrades = new Bitstamp_WS({
    channel: wsOpts.trades.channel,
    evType: 'trade',
  })

  const wsQuotes = new Bitstamp_WS({
    channel: wsOpts.quotes.channel,
    evType: 'data',
  })

  wsQuotes.on('data', function(data) {
    wsquotes = {
      bid: data.bids[0][0],
      ask: data.asks[0][0],
    }
  })

  wsTrades.on('trade', function(data) {
    wstrades.push({
      trade_id: data.id,
      time: Number(data.timestamp) * 1000,
      size: data.amount,
      price: data.price,
      side: data.type === 0 ? 'buy' : 'sell',
    })
    if (wstrades.length > 30) wstrades.splice(0, 10)
  })
  // -----------------------------------------------------

  function statusErr(err, body) {
    if (typeof body === 'undefined') {
      const ret: Record<string, any> = {}
      const res = err.toString().split(':', 2)
      ret.status = res[1]
      return new Error(ret.status)
    } else {
      if (body.error) {
        return new Error('\nError: ' + body.error)
      } else {
        return body
      }
    }
  }

  function retry(method, args) {
    const to = args.wait
    if (method !== 'getTrades') {
      console.error(('\nBitstamp API is not answering! unable to call ' + method + ', retrying in ' + to + 's').red)
    }
    setTimeout(function() {
      exchange[method].apply(exchange, args)
    }, to * 1000)
  }

  let lastBalance: Record<string, any> = { asset: 0, currency: 0 }
  const orders = {}

  const exchange = {
    name: 'bitstamp',
    historyScan: false,
    makerFee: 0.25,
    takerFee: 0.25,

    getProducts() {
      return require('./products.json')
    },

    // -----------------------------------------------------
    // Public API functions
    // getQuote() and getTrades() are using Bitstamp websockets
    // The data is not done by calling the interface function,
    // but rather pulled from the "wstrades" and "wsquotes" JSOM objects
    // Those objects are populated by the websockets event handlers

    getTrades(opts, cb) {
      const args = {
        wait: 2, // Seconds
        productId: wsOpts.currencyPair,
      }
      if (!wstrades.length) return retry('getTrades', args)
      const t = wstrades
      const trades = t.map(function(trade) {
        return trade
      })
      cb(null, trades)
    },

    getQuote(opts, cb) {
      const args = {
        wait: 2, // Seconds
        currencyPair: wsOpts.currencyPair,
      }
      if (typeof wsquotes.bid == undefined) return retry('getQuote', args)
      cb(null, wsquotes)
    },

    // -----------------------------------------------------
    // Private (authenticated) functions
    //

    getBalance(opts, cb) {
      const args = {
        currency: opts.currency.toLowerCase(),
        asset: opts.asset.toLowerCase(),
        wait: 10,
      }
      const client = authedClient()
      client.balance(null, function(err, body) {
        body = statusErr(err, body)
        if (body.status === 'error') {
          return retry('getBalance', args)
        }
        let balance: Record<string, any> = {
          asset: '0',
          asset_hold: '0',
          currency: '0',
          currency_hold: '0',
        }

        // Dirty hack to avoid engine.js bailing out when balance has 0 value
        // The added amount is small enough to not have any significant effect
        // @ts-ignore
        balance.currency = n(body[opts.currency.toLowerCase() + '_balance']) + 0.000001
        // @ts-ignore
        balance.asset = n(body[opts.asset.toLowerCase() + '_balance']) + 0.000001
        // @ts-ignore
        balance.currency_hold = n(body[opts.currency.toLowerCase() + '_reserved']) + 0.000001
        // @ts-ignore
        balance.asset_hold = n(body[opts.asset.toLowerCase() + '_reserved']) + 0.000001

        if (typeof balance.asset == undefined || typeof balance.currency == undefined) {
          console.log('Communication delay, fallback to previous balance')
          balance = lastBalance
        } else {
          lastBalance = balance
        }
        cb(null, balance)
      })
    },

    cancelOrder(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = authedClient()
      client.cancel_order(opts.order_id, function(err, body) {
        body = statusErr(err, body)
        if (body.status === 'error') {
          return retry('cancelOrder', func_args)
        }
        cb()
      })
    },

    trade(type, opts, cb) {
      const client = authedClient()
      const currencyPair = joinProduct(opts.productId).toLowerCase()
      if (typeof opts.order_type === 'undefined') {
        opts.order_type = 'maker'
      }
      // Bitstamp has no "post only" trade type
      opts.post_only = false
      if (opts.order_type === 'maker') {
        client.tradeDaily(type, currencyPair, opts.size, opts.price, function(err, body) {
          body = statusErr(err, body)
          if (body.status === 'error') {
            const order = { status: 'rejected', reject_reason: 'balance' }
            return cb(null, order)
          } else {
            // Statuses:
            // 'In Queue', 'Open', 'Finished'
            body.status = 'done'
          }
          if (body.datetime) body.done_at = body.created_at = body.datetime

          orders['~' + body.id] = body
          cb(null, body)
        })
      } else {
        // order_type === taker
        client.tradeMarket(type, currencyPair, opts.size, function(err, body) {
          body = statusErr(err, body)
          if (body.status === 'error') {
            const order = { status: 'rejected', reject_reason: 'balance' }
            return cb(null, order)
          } else {
            body.status = 'done'
          }
          orders['~' + body.id] = body
          cb(null, body)
        })
      }
    },

    buy(opts, cb) {
      exchange.trade('buy', opts, cb)
    },

    sell(opts, cb) {
      exchange.trade('sell', opts, cb)
    },

    getOrder(opts, cb) {
      const client = authedClient()
      client.order_status(opts.order_id, function(err, body) {
        body = statusErr(err, body)
        if (body.status === 'error') {
          body = orders['~' + opts.order_id]
          body.status = 'done'
          body.done_reason = 'canceled'
        } else if (body.status === 'Finished') body.status = 'done'

        if (body.status === 'done') {
          if (body.transactions && body.transactions[0].datetime) body.done_at = body.transactions[0].datetime
        }

        cb(null, body)
      })
    },

    // return the property used for range querying.
    getCursor(trade) {
      return trade.trade_id
    },
  }
  return exchange
}
