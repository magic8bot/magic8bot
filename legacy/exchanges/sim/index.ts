import path from 'path'
import n from 'numbro'
import _ from 'lodash'

import { loadExchange } from '..'

export default (conf, s) => {
  const latency = 100 // In milliseconds, enough to be realistic without being disruptive
  const so = s.options
  const exchange_id = so.selector.exchange_id
  const real_exchange = loadExchange(exchange_id)(conf)

  let now
  const balance = { asset: so.asset_capital, currency: so.currency_capital, asset_hold: 0, currency_hold: 0 }

  let last_order_id = 1001
  const orders = {}
  const openOrders = {}
  const debug = false // debug output specific to the sim exchange

  // When orders change in any way, it's likely our "_hold" values have changed. Recalculate them
  function recalcHold() {
    balance.currency_hold = 0
    balance.asset_hold = 0
    _.each(openOrders, function(order) {
      // @ts-ignore
      if (order.tradetype === 'buy') {
        // @ts-ignore
        balance.currency_hold += n(order.remaining_size)
          // @ts-ignore
          .multiply(n(order.price))
          .value()
      } else {
        // @ts-ignore
        balance.asset_hold += n(order.remaining_size).value()
      }
    })
  }

  const exchange = {
    name: 'sim',
    historyScan: real_exchange.historyScan,
    historyScanUsesTime: real_exchange.historyScanUsesTime,
    makerFee: real_exchange.makerFee,
    takerFee: real_exchange.takerFee,
    dynamicFees: real_exchange.dynamicFees,

    getProducts: real_exchange.getProducts,

    getTrades(opts, cb) {
      if (so.mode === 'paper') {
        return real_exchange.getTrades(opts, cb)
      } else {
        return cb(null, [])
      }
    },

    getBalance(opts, cb) {
      setTimeout(function() {
        s.sim_asset = balance.asset
        return cb(null, balance)
      }, latency)
    },

    getQuote(opts, cb) {
      if (so.mode === 'paper') {
        return real_exchange.getQuote(opts, cb)
      } else {
        setTimeout(function() {
          return cb(null, {
            bid: s.period.close,
            ask: s.period.close,
          })
        }, latency)
      }
    },

    cancelOrder(opts, cb) {
      setTimeout(function() {
        const order_id = '~' + opts.order_id
        const order = orders[order_id]

        if (order.status === 'open') {
          order.status = 'cancelled'
          delete openOrders[order_id]
          recalcHold()
        }

        cb(null)
      }, latency)
    },

    buy(opts, cb) {
      setTimeout(function() {
        if (debug) {
          console.log(
            `buying ${opts.size * opts.price} vs on hold: ${balance.currency} - ${
              balance.currency_hold
            } = ${balance.currency - balance.currency_hold}`
          )
        }
        if (opts.size * opts.price > balance.currency - balance.currency_hold) {
          if (debug) console.log('nope')
          return cb(null, { status: 'rejected', reject_reason: 'balance' })
        }

        const result = {
          id: last_order_id++,
        }

        const order = {
          id: result.id,
          status: 'open',
          price: opts.price,
          size: opts.size,
          orig_size: opts.size,
          remaining_size: opts.size,
          post_only: !!opts.post_only,
          filled_size: 0,
          ordertype: opts.order_type,
          tradetype: 'buy',
          orig_time: now,
          time: now,
          created_at: now,
        }

        orders['~' + result.id] = order
        openOrders['~' + result.id] = order
        recalcHold()
        cb(null, order)
      }, latency)
    },

    sell(opts, cb) {
      setTimeout(function() {
        if (debug) {
          console.log(
            `selling ${opts.size} vs on hold: ${balance.asset} - ${balance.asset_hold} = ${balance.asset -
              balance.asset_hold}`
          )
        }
        if (opts.size > balance.asset - balance.asset_hold) {
          if (debug) console.log('nope')
          return cb(null, { status: 'rejected', reject_reason: 'balance' })
        }

        const result = {
          id: last_order_id++,
        }

        const order = {
          id: result.id,
          status: 'open',
          price: opts.price,
          size: opts.size,
          orig_size: opts.size,
          remaining_size: opts.size,
          post_only: !!opts.post_only,
          filled_size: 0,
          ordertype: opts.order_type,
          tradetype: 'sell',
          orig_time: now,
          time: now,
          created_at: now,
        }
        orders['~' + result.id] = order
        openOrders['~' + result.id] = order
        recalcHold()
        cb(null, order)
      }, latency)
    },

    getOrder(opts, cb) {
      setTimeout(function() {
        const order = orders['~' + opts.order_id]
        cb(null, order)
      }, latency)
    },

    setFees(opts) {
      if (so.mode === 'paper') {
        return real_exchange.setFees(opts)
      }
    },

    getCursor: real_exchange.getCursor,

    getTime() {
      return now
    },

    processTrade(trade) {
      let orders_changed = false

      _.each(openOrders, function(order) {
        // @ts-ignore
        if (order.tradetype === 'buy') {
          // @ts-ignore
          if (trade.time - order.time < so.order_adjust_time) {
            // Not time yet
            // @ts-ignore
          } else if (trade.price <= Number(order.price)) {
            processBuy(order, trade)
            orders_changed = true
          }
          // @ts-ignore
        } else if (order.tradetype === 'sell') {
          // @ts-ignore
          if (trade.time - order.time < so.order_adjust_time) {
            // Not time yet
            // @ts-ignore
          } else if (trade.price >= order.price) {
            processSell(order, trade)
            orders_changed = true
          }
        }
      })

      if (orders_changed) recalcHold()
    },
  }

  function processBuy(buy_order, trade) {
    let fee = 0
    const size = Math.min(buy_order.remaining_size, trade.size)
    let price = buy_order.price

    // Buying, so add asset
    balance.asset = n(balance.asset)
      .add(size)
      .format('0.00000000')

    // Process balance changes
    if (so.order_type === 'maker') {
      if (exchange.makerFee) {
        fee = n(size)
          .multiply(exchange.makerFee / 100)
          .value()
      }
    } else if (so.order_type === 'taker') {
      if (s.exchange.takerFee) {
        fee = n(size)
          .multiply(exchange.takerFee / 100)
          .value()
      }
    }
    if (so.order_type === 'maker') {
      price = n(price)
        .add(n(price).multiply(so.avg_slippage_pct / 100))
        .format('0.00000000')
      if (exchange.makerFee) {
        balance.asset = n(balance.asset)
          .subtract(fee)
          .format('0.00000000')
      }
    } else if (so.order_type === 'taker') {
      if (exchange.takerFee) {
        balance.asset = n(balance.asset)
          .subtract(fee)
          .format('0.00000000')
      }
    }

    const total = n(price).multiply(size)
    balance.currency = n(balance.currency)
      .subtract(total)
      .format('0.00000000')

    // Process existing order size changes
    const order = buy_order
    order.filled_size = order.filled_size + size
    order.remaining_size = order.size - order.filled_size

    if (order.remaining_size <= 0) {
      if (debug) console.log('full fill bought')
      order.status = 'done'
      order.done_at = trade.time
      delete openOrders['~' + order.id]
    } else {
      if (debug) console.log('partial fill buy')
    }
  }

  function processSell(sell_order, trade) {
    let fee = 0
    const size = Math.min(sell_order.remaining_size, trade.size)
    let price = sell_order.price

    // Selling, so subtract asset
    balance.asset = n(balance.asset)
      .subtract(size)
      .value()

    // Process balance changes
    if (so.order_type === 'maker') {
      if (exchange.makerFee) {
        fee = n(size)
          .multiply(exchange.makerFee / 100)
          .value()
      }
    } else if (so.order_type === 'taker') {
      if (exchange.takerFee) {
        fee = n(size)
          .multiply(exchange.takerFee / 100)
          .value()
      }
    }
    if (so.order_type === 'maker') {
      price = n(price)
        .subtract(n(price).multiply(so.avg_slippage_pct / 100))
        .format('0.00000000')
      if (exchange.makerFee) {
        fee = n(size)
          .multiply(exchange.makerFee / 100)
          .multiply(price)
          .value()
        balance.currency = n(balance.currency)
          .subtract(fee)
          .format('0.00000000')
      }
    } else if (so.order_type === 'taker') {
      if (exchange.takerFee) {
        balance.currency = n(balance.currency)
          .subtract(fee)
          .format('0.00000000')
      }
    }

    const total = n(price).multiply(size)
    balance.currency = n(balance.currency)
      .add(total)
      .format('0.00000000')

    // Process existing order size changes
    const order = sell_order
    order.filled_size = order.filled_size + size
    order.remaining_size = order.size - order.filled_size

    if (order.remaining_size <= 0) {
      if (debug) console.log('full fill sold')
      order.status = 'done'
      order.done_at = trade.time
      delete openOrders['~' + order.id]
    } else {
      if (debug) console.log('partial fill sell')
    }
  }

  return exchange
}
