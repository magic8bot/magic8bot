import 'colors'

import QuadrigaCX from 'quadrigacx'
import path from 'path'
import minimist from 'minimist'
import moment from 'moment'
import n from 'numbro'

export default (conf) => {
  const s = {
    options: minimist(process.argv),
  }
  const so = s.options

  let shownWarnings = false

  let public_client, authed_client

  function publicClient() {
    if (!public_client) public_client = new QuadrigaCX('1', '', '')
    return public_client
  }

  function authedClient() {
    if (!authed_client) {
      if (!conf.quadriga || !conf.quadriga.key || (!conf.quadriga.key as any) === 'YOUR-API-KEY') {
        throw new Error('please configure your Quadriga credentials in ' + path.resolve(__dirname, 'conf.js'))
      }

      authed_client = new QuadrigaCX(conf.quadriga.client_id, conf.quadriga.key, conf.quadriga.secret)
    }
    return authed_client
  }

  function joinProduct(productId) {
    return (productId.split('-')[0] + '_' + productId.split('-')[1]).toLowerCase()
  }

  function retry(method, args, error) {
    if (error.code === 200) {
      console.error(`\nQuadrigaCX API rate limit exceeded! unable to call ${method}, aborting`.red)
      return
    }

    if (method !== 'getTrades') {
      console.error(`\nQuadrigaCX API is down: (${method}) ${error.message}`.red)
      console.error('Retrying in 30 seconds ...'.yellow)
    }

    setTimeout(function() {
      exchange[method].apply(exchange, args)
    }, 30000)
  }

  function debugOut(msg) {
    if (so.debug) console.log(msg)
  }

  const orders = {}

  const exchange = {
    name: 'quadriga',
    historyScan: 'backward',
    makerFee: 0.5,
    takerFee: 0.5,

    getProducts() {
      return require('./products.json')
    },

    getTrades(opts, cb) {
      const func_args = [].slice.call(arguments)
      const args = {
        book: joinProduct(opts.productId),
        time: 'hour',
      }

      const client = publicClient()
      client.api('transactions', args, function(err, body) {
        if (!shownWarnings) {
          console.log('please note: the quadriga api does not support backfilling.')
          console.log('please note: period lengths should be set to 1h or less.')
          shownWarnings = true
        }

        if (err) return retry('getTrades', func_args, err)
        if (body.error) return retry('getTrades', func_args, body.error)

        const trades = body
          .filter((t) => {
            return typeof opts.from === 'undefined' ? true : moment.unix(t.date).valueOf() > opts.from
          })
          .reverse()
          .map(function(trade) {
            return {
              trade_id: trade.tid,
              time: moment.unix(trade.date).valueOf(),
              size: Number(trade.amount),
              price: Number(trade.price),
              side: trade.side,
            }
          })

        cb(null, trades)
      })
    },

    getBalance(opts, cb) {
      const func_args = [].slice.call(arguments)
      const client = authedClient()
      client.api('balance', function(err, wallet) {
        if (err) return retry('getBalance', func_args, err)
        if (wallet.error) return retry('getBalance', func_args, wallet.error)

        const currency = opts.currency.toLowerCase()
        const asset = opts.asset.toLowerCase()

        const balance: Record<string, any> = {
          asset: 0,
          currency: 0,
        }

        balance.currency = n(wallet[currency + '_balance']).format('0.00')
        balance.asset = n(wallet[asset + '_balance']).format('0.00')

        balance.currency_hold = n(wallet[currency + '_reserved']).format('0.00000000')
        balance.asset_hold = n(wallet[asset + '_reserved']).format('0.00000000')

        debugOut('Balance/Reserve/Hold:')
        debugOut(
          `  ${currency} (${wallet[currency + '_balance']}/${wallet[currency + '_reserved']}/${
            wallet[currency + '_available']
          })`
        )
        debugOut(
          `  ${asset} (${wallet[asset + '_balance']}/${wallet[asset + '_reserved']}/${wallet[asset + '_available']})`
        )

        cb(null, balance)
      })
    },

    getQuote(opts, cb) {
      const func_args = [].slice.call(arguments)

      const params = {
        book: joinProduct(opts.productId),
      }

      const client = publicClient()
      client.api('ticker', params, function(err, quote) {
        if (err) return retry('getQuote', func_args, err)
        if (quote.error) return retry('getQuote', func_args, quote.error)

        const r = {
          bid: String(quote.bid),
          ask: String(quote.ask),
        }

        cb(null, r)
      })
    },

    cancelOrder(opts, cb) {
      const func_args = [].slice.call(arguments)
      const params = {
        id: opts.order_id,
      }

      debugOut(`Cancelling order ${opts.order_id}`)

      const client = authedClient()
      client.api('cancel_order', params, function(err, body) {
        if (err) return retry('cancelOrder', func_args, err)
        if (body.error) return retry('cancelOrder', func_args, body.error)
        cb()
      })
    },

    buy(opts, cb) {
      const params: Record<string, any> = {
        amount: opts.size,
        book: joinProduct(opts.productId),
      }

      if (opts.order_type === 'maker') {
        params.price = n(opts.price).format('0.00')
      }

      debugOut(`Requesting ${opts.order_type} buy for ${opts.size} assets`)

      const client = authedClient()
      client.api('buy', params, function(err, body) {
        const order: Record<string, any> = {
          id: null,
          status: 'open',
          price: Number(opts.price),
          size: Number(opts.size),
          created_at: new Date().getTime(),
          filled_size: 0,
          ordertype: opts.order_type,
        }

        if (err) return cb(err)
        if (body.error) return cb(body.error)

        if (opts.order_type === 'taker') {
          order.status = 'done'
          order.done_at = new Date().getTime()

          if (body.orders_matched) {
            let asset_total = 0
            let price_total = 0.0
            const order_count = body.orders_matched.length
            for (let idx = 0; idx < order_count; idx++) {
              asset_total = asset_total + Number(body.orders_matched[idx].amount)
              price_total =
                price_total + Number(body.orders_matched[idx].amount) * Number(body.orders_matched[idx].price)
            }

            order.price = price_total / asset_total
            order.size = asset_total
          } else {
            order.price = Number(body.price)
            order.size = Number(body.amount)
          }
        }

        debugOut(`    Purchase ID: ${body.id}`)

        order.id = body.id
        orders['~' + body.id] = order
        cb(null, order)
      })
    },

    sell(opts, cb) {
      const params: Record<string, any> = {
        amount: opts.size,
        book: joinProduct(opts.productId),
      }

      if (opts.order_type === 'maker' && typeof opts.type === 'undefined') {
        params.price = n(opts.price).format('0.00')
      }

      debugOut(`Requesting ${opts.order_type} sell for ${opts.size} assets`)

      const client = authedClient()
      client.api('sell', params, function(err, body) {
        const order: Record<string, any> = {
          id: null,
          status: 'open',
          price: Number(opts.price),
          size: Number(opts.size),
          created_at: new Date().getTime(),
          filled_size: 0,
          ordertype: opts.order_type,
        }

        if (err) return cb(err)
        if (body.error) return cb(body.error)

        if (opts.order_type === 'taker') {
          order.status = 'done'
          order.done_at = new Date().getTime()

          if (body.orders_matched) {
            let asset_total = 0
            let price_total = 0.0
            const order_count = body.orders_matched.length
            for (let idx = 0; idx < order_count; idx++) {
              asset_total = asset_total + Number(body.orders_matched[idx].amount)
              price_total =
                price_total + Number(body.orders_matched[idx].amount) * Number(body.orders_matched[idx].price)
            }

            order.price = price_total / asset_total
            order.size = asset_total
          } else {
            order.price = Number(body.price)
            order.size = Number(body.amount)
          }
        }

        debugOut(`    Sell ID: ${body.id}`)

        order.id = body.id
        orders['~' + body.id] = order
        cb(null, order)
      })
    },

    getOrder(opts, cb) {
      const order = orders['~' + opts.order_id]
      const params = {
        id: opts.order_id,
      }

      const client = authedClient()
      client.api('lookup_order', params, function(err, body) {
        if (err) return cb(err)
        if (body.error) return cb(body.error)

        if (body[0].status === 2) {
          order.status = 'done'
          order.done_at = new Date().getTime()
          order.filled_size = n(body[0].amount).format('0.00000')
          order.price = n(body[0].price).format('0.00')
          return cb(null, order)
        } else {
          order.filled_size = n(body[0].amount).format('0.00000')
          order.price = n(body[0].price).format('0.00')
        }

        debugOut(`Lookup order ${opts.order_id} status is ${body.status}`)

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
