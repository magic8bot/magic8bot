//
// Warning - Some of the functions need testing
// by someone in posession of a WEXNZ account
// In particular this is the case for
// the buy, sell, cancelOrderand getOrderfunctions
//
import WEXNZ from 'wexnz'

export default (conf) => {
  let public_client, authed_client

  function publicClient() {
    if (!public_client) {
      public_client = new WEXNZ()
    }
    return public_client
  }

  function authedClient() {
    if (!authed_client) {
      if (!conf.wexnz || !conf.wexnz.key || conf.wexnz.key === 'YOUR-API-KEY') {
        throw new Error('please configure your WEX.NZ credentials in conf.js')
      }
      authed_client = new WEXNZ(conf.wexnz.key, conf.wexnz.secret)
    }
    return authed_client
  }

  function joinProduct(product_id) {
    return (product_id.split('-')[0] + '_' + product_id.split('-')[1]).toLowerCase()
  }

  function statusErr(err, body) {
    if (body === null) {
      return new Error(err)
    } else if (!body.success) {
      if (body.error === 'invalid api key' || body.error === 'invalid sign') {
        console.log(err)
        throw new Error('please correct your WEXNZ credentials in conf.js')
      } else if (err) {
        return new Error('\nError: ' + err)
      }
    } else {
      return body
    }
  }

  function retry(method, args, err) {
    if (method !== 'getTrades') {
      console.error(('\nWEXNZ API is down! unable to call ' + method + ', retrying in 10s').red)
      if (err) console.error(err)
      console.error(args.slice(0, -1))
    }
    setTimeout(function() {
      exchange[method].apply(exchange, args)
    }, 10000)
  }

  const orders = {}

  const exchange = {
    name: 'wexnz',
    historyScan: 'backward',
    makerFee: 0.2,
    takerFee: 0.2,
    backfillRateLimit: 5000,

    getProducts() {
      return require('./products.json')
    },

    getTrades(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = publicClient()
      const pair = joinProduct(opts.product_id)
      const args: Record<string, any> = {}
      if (opts.from) {
        // move cursor into the future
        args.before = opts.from
      } else if (opts.to) {
        // move cursor into the past
        args.after = opts.to
      }
      client.trades({ pair, count: 100000000 }, function(err, body) {
        if (err) return retry('getTrades', func_args, err)
        const trades = body.map(function(trade) {
          return {
            trade_id: trade.tid,
            time: trade.date * 1000,
            // time: new Date(trade.date).getTime(),
            size: trade.amount,
            price: trade.price,
            side: trade.trade_type,
          }
        })
        cb(null, trades)
      })
    },

    getBalance(opts, cb) {
      const args = {
        currency: opts.currency.toLowerCase(),
        asset: opts.asset.toLowerCase(),
        wait: 10,
      }
      const func_args = [].slice.call(arguments)
      const client = authedClient()
      client.getInfo(function(err, body) {
        body = statusErr(err, body)
        if (err) {
          return retry('getBalance', func_args, err)
        }
        if (body.success) {
          const balance: Record<string, any> = { asset: 0, currency: 0 }
          const funds = body.return.funds
          balance.currency = funds[args.currency]
          balance.asset = funds[args.asset]
          balance.currency_hold = 0
          balance.asset_hold = 0
          cb(null, balance)
        }
      })
    },

    getQuote(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = publicClient()
      const pair = joinProduct(opts.product_id).toLowerCase()
      client.ticker({ pair }, function(err, body) {
        if (err) return retry('getQuote', func_args, err)
        cb(null, { bid: body.ticker.buy, ask: body.ticker.sell })
      })
    },

    cancelOrder(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = authedClient()
      client.cancelOrder(opts.order_id, function(err, resp, body) {
        body = statusErr(err, body)
        // Fix me - Check return codes
        if (body && (body.message === 'Order already done' || body.message === 'order not found')) return cb()
        if (err) return retry('cancelOrder', func_args, err)
        cb()
      })
    },

    trade(type, opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = authedClient()
      const pair = joinProduct(opts.product_id)
      /* WEXNZ has no order type?
      if (typeof opts.post_only === 'undefined') {
        opts.post_only = true
      }
      if (opts.order_type === 'taker') {
        delete opts.price
        delete opts.post_only
        opts.type = 'market'
      }
      */
      delete opts.order_type
      client.trade({ pair, type, rate: opts.price, amount: opts.size }, function(err, body) {
        body = statusErr(err, body)
        // Fix me - Check return codes from API
        if (body && body.message === 'Insufficient funds') {
          const order = {
            status: 'rejected',
            reject_reason: 'balance',
          }
          return cb(null, order)
        }
        if (err) return retry(type, func_args, err)
        orders['~' + body.id] = body
        cb(null, body)
        // else console.log(err)
      })
    },

    buy(opts, cb) {
      exchange.trade('buy', opts, cb)
    },

    sell(opts, cb) {
      exchange.trade('sell', opts, cb)
    },

    getOrder(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = authedClient()
      // Fix me - Check return result
      const orderInfo = {
        // from: opts.order_id,
        count: 1,
        from_id: opts.order_id,
        // end_id: opts.order_id,
        pair: opts.product_id,
      }
      client.activeOrders(orderInfo, function(err, resp, body) {
        body = statusErr(err, body)
        if (err) return retry('getOrder', func_args, err)
        if (resp.statusCode === 404) {
          // order was cancelled. recall from cache
          body = orders['~' + opts.order_id]
          body.status = 'done'
          body.done_reason = 'canceled'
        }
        // Fix me
        body.filled_size = 0
        body.remaining_size = resp.return[opts.order_id].amount
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
