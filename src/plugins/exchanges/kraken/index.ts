import 'colors'

import KrakenClient from 'kraken-api'
import minimist from 'minimist'
import moment from 'moment'
import n from 'numbro'

export default (conf) => {
  const s = {
    options: minimist(process.argv),
  }
  const so = s.options

  let public_client, authed_client
  // var recoverableErrors = new RegExp(/(ESOCKETTIMEDOUT|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|API:Invalid nonce|API:Rate limit exceeded|between Cloudflare and the origin web server)/)
  const recoverableErrors = new RegExp(
    /(ESOCKETTIMEDOUT|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND|API:Invalid nonce|between Cloudflare and the origin web server|The web server reported a gateway time-out|The web server reported a bad gateway|525: SSL handshake failed|Service:Unavailable|api.kraken.com \| 522:)/
  )
  const silencedRecoverableErrors = new RegExp(/(ESOCKETTIMEDOUT|ETIMEDOUT)/)

  function publicClient() {
    if (!public_client) {
      public_client = new KrakenClient()
    }
    return public_client
  }

  function authedClient() {
    if (!authed_client) {
      if (!conf.kraken || !conf.kraken.key || conf.kraken.key === 'YOUR-API-KEY') {
        throw new Error('please configure your Kraken credentials in conf.js')
      }
      authed_client = new KrakenClient(conf.kraken.key, conf.kraken.secret)
    }
    return authed_client
  }

  // This is to deal with a silly bug where kraken doesn't use a consistent definition for currency
  // with certain assets they will mix the use of 'Z' and 'X' prefixes
  function joinProductFormatted(product_id) {
    const asset = product_id.split('-')[0]
    let currency = product_id.split('-')[1]

    const assetsToFix = ['BCH', 'DASH', 'EOS', 'GNO']
    if (assetsToFix.indexOf(asset) >= 0 && currency.length > 3) {
      currency = currency.substring(1)
    }
    return asset + currency
  }

  function retry(method, args, error) {
    let timeout, errorMsg
    if (error.message.match(/API:Rate limit exceeded/)) {
      timeout = 10000
    } else {
      timeout = 150
    }

    // silence common timeout errors
    if (so.debug || !error.message.match(silencedRecoverableErrors)) {
      if (error.message.match(/between Cloudflare and the origin web server/)) {
        errorMsg = 'Connection between Cloudflare CDN and api.kraken.com failed'
      } else if (error.message.match(/The web server reported a gateway time-out/)) {
        errorMsg = 'Web server Gateway time-out'
      } else if (error.message.match(/The web server reported a bad gateway/)) {
        errorMsg = 'Web server bad Gateway'
      } else if (error.message.match(/525: SSL handshake failed/)) {
        errorMsg = 'SSL handshake failed'
      } else if (error.message.match(/Service:Unavailable/)) {
        errorMsg = 'Service Unavailable'
      } else if (error.message.match(/api.kraken.com \| 522:/)) {
        errorMsg = 'Generic 522 Server error'
      } else {
        errorMsg = error
      }
      console.warn(
        ('\nKraken API warning - unable to call ' + method + ' (' + errorMsg + '), retrying in ' + timeout / 1000 + 's')
          .yellow
      )
    }
    setTimeout(function() {
      exchange[method].apply(exchange, args)
    }, timeout)
  }

  const orders = {}

  const exchange = {
    name: 'kraken',
    historyScan: 'forward',
    makerFee: 0.16,
    takerFee: 0.26,
    // The limit for the public API is not documented, 1750 ms between getTrades in backfilling seems to do the trick to omit warning messages.
    backfillRateLimit: 3500,

    getProducts() {
      return require('./products.json')
    },

    getTrades(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = publicClient()
      const args: Record<string, any> = {
        pair: joinProductFormatted(opts.product_id),
      }
      if (opts.from) {
        args.since = Number(opts.from) * 1000000
      }

      client.api('Trades', args, function(error, data) {
        if (error && error.message.match(recoverableErrors)) {
          return retry('getTrades', func_args, error)
        }
        if (error) {
          console.error('\nTrades error:'.red)
          console.error(error)
          return cb(null, [])
        }
        if (data.error.length) {
          return cb(data.error.join(','))
        }

        const trades = []
        Object.keys(data.result[args.pair]).forEach(function(i) {
          const trade = data.result[args.pair][i]
          // @ts-ignore
          if (!opts.from || Number(opts.from) < moment.unix(trade[2].valueOf())) {
            trades.push({
              trade_id: trade[2] + trade[1] + trade[0],
              time: moment.unix(trade[2]).valueOf(),
              size: parseFloat(trade[1]),
              price: parseFloat(trade[0]),
              side: trade[3] == 'b' ? 'buy' : 'sell',
            })
          }
        })

        cb(null, trades)
      })
    },

    getBalance(opts, cb) {
      const args = [].slice.call(arguments)
      const client = authedClient()
      client.api('Balance', null, function(error, data) {
        const balance = {
          asset: '0',
          asset_hold: '0',
          currency: '0',
          currency_hold: '0',
        }

        if (error) {
          if (error.message.match(recoverableErrors)) {
            return retry('getBalance', args, error)
          }
          console.error('\ngetBalance error:'.red)
          console.error(error)
          return cb(error)
        }

        if (data.error.length) {
          return cb(data.error.join(','))
        }

        if (data.result[opts.currency]) {
          balance.currency = n(data.result[opts.currency]).format('0.00000000')
          balance.currency_hold = '0'
        }

        if (data.result[opts.asset]) {
          balance.asset = n(data.result[opts.asset]).format('0.00000000')
          balance.asset_hold = '0'
        }

        cb(null, balance)
      })
    },

    getQuote(opts, cb) {
      const args = [].slice.call(arguments)
      const client = publicClient()
      const pair = joinProductFormatted(opts.product_id)
      client.api(
        'Ticker',
        {
          pair,
        },
        function(error, data) {
          if (error) {
            if (error.message.match(recoverableErrors)) {
              return retry('getQuote', args, error)
            }
            console.error('\ngetQuote error:'.red)
            console.error(error)
            return cb(error)
          }
          if (data.error.length) {
            return cb(data.error.join(','))
          }
          cb(null, {
            bid: data.result[pair].b[0],
            ask: data.result[pair].a[0],
          })
        }
      )
    },

    cancelOrder(opts, cb) {
      const args = [].slice.call(arguments)
      const client = authedClient()
      client.api(
        'CancelOrder',
        {
          txid: opts.order_id,
        },
        function(error, data) {
          if (error) {
            if (error.message.match(recoverableErrors)) {
              return retry('cancelOrder', args, error)
            }
            console.error('\ncancelOrder error:'.red)
            console.error(error)
            return cb(error)
          }
          if (data.error.length) {
            return cb(data.error.join(','))
          }
          if (so.debug) {
            console.log('\nFunction: cancelOrder')
            console.log(data)
          }
          cb(error)
        }
      )
    },

    trade(type, opts, cb) {
      const args = [].slice.call(arguments)
      const client = authedClient()
      const params: Record<string, any> = {
        pair: joinProductFormatted(opts.product_id),
        type,
        ordertype: opts.order_type === 'taker' ? 'market' : 'limit',
        volume: opts.size,
        trading_agreement: conf.kraken.tosagree,
      }
      if (opts.post_only === true && params.ordertype === 'limit') {
        params.oflags = 'post'
      }
      if ('price' in opts) {
        params.price = opts.price
      }
      if (so.debug) {
        console.log('\nFunction: trade')
        console.log(params)
      }
      client.api('AddOrder', params, function(error, data) {
        if (error && error.message.match(recoverableErrors)) {
          return retry('trade', args, error)
        }

        const order: Record<string, any> = {
          id: data && data.result ? data.result.txid[0] : null,
          status: 'open',
          price: opts.price,
          size: opts.size,
          created_at: new Date().getTime(),
          filled_size: '0',
        }

        if (opts.order_type === 'maker') {
          order.post_only = !!opts.post_only
        }

        if (so.debug) {
          console.log('\nData:')
          console.log(data)
          console.log('\nOrder:')
          console.log(order)
          console.log('\nError:')
          console.log(error)
        }

        if (error) {
          if (error.message.match(/Order:Insufficient funds$/)) {
            order.status = 'rejected'
            order.reject_reason = 'balance'
            return cb(null, order)
          } else if (error.message.length) {
            console.error('\nUnhandeld AddOrder error:'.red)
            console.error(error)
            order.status = 'rejected'
            order.reject_reason = error.message
            return cb(null, order)
          } else if (data.error.length) {
            console.error('\nUnhandeld AddOrder error:'.red)
            console.error(data.error)
            order.status = 'rejected'
            order.reject_reason = data.error.join(',')
          }
        }

        orders['~' + data.result.txid[0]] = order
        cb(null, order)
      })
    },

    buy(opts, cb) {
      exchange.trade('buy', opts, cb)
    },

    sell(opts, cb) {
      exchange.trade('sell', opts, cb)
    },

    getOrder(opts, cb) {
      const args = [].slice.call(arguments)
      const order = orders['~' + opts.order_id]
      if (!order) return cb(new Error('order not found in cache'))
      const client = authedClient()
      const params = {
        txid: opts.order_id,
      }
      client.api('QueryOrders', params, function(error, data) {
        if (error) {
          if (error.message.match(recoverableErrors)) {
            return retry('getOrder', args, error)
          }
          console.error('\ngetOrder error:'.red)
          console.error(error)
          return cb(error)
        }
        if (data.error.length) {
          return cb(data.error.join(','))
        }
        const orderData = data.result[params.txid]
        if (so.debug) {
          console.log('\nfunction: QueryOrders')
          console.log(orderData)
        }

        if (!orderData) {
          return cb('Order not found')
        }

        if (orderData.status === 'canceled' && orderData.reason === 'Post only order') {
          order.status = 'rejected'
          order.reject_reason = 'post only'
          order.done_at = new Date().getTime()
          order.filled_size = '0.00000000'
          return cb(null, order)
        }

        if (
          orderData.status === 'closed' ||
          (orderData.status === 'canceled' && orderData.reason === 'User canceled')
        ) {
          order.status = 'done'
          order.done_at = new Date().getTime()
          order.filled_size = n(orderData.vol_exec).format('0.00000000')
          order.price = n(orderData.price).format('0.00000000')
          return cb(null, order)
        }

        cb(null, order)
      })
    },

    // return the property used for range querying.
    getCursor(trade) {
      return trade.time || trade
    },
  }
  return exchange
}
