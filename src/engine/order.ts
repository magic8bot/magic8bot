import { OrderNotFound, InsufficientFunds } from 'ccxt'
import cloneDeep from 'deep-clone'

import { WalletStore, OrderStore, ORDER_STATE } from '@store'
import { EVENT, eventBus, OrderWithTrades, StrategyConfig } from '@lib'
import { ExchangeProvider, OrderOpts } from '@exchange'
import { StoreOpts } from '@m8bTypes'
import { sleep, asyncWrap } from '@util'

import { logger } from '../util/logger'

export class OrderEngine {
  private opts: {
    exchange: string
    symbol: string
    strategy: string
  }

  private orderPollInterval: number

  private readonly orderStore = OrderStore.instance
  private readonly walletStore = WalletStore.instance

  private readonly storeOpts: StoreOpts

  constructor(private readonly exchangeProvider: ExchangeProvider, { exchange, symbol, strategy, orderPollInterval }: StrategyConfig) {
    this.storeOpts = { exchange, symbol, strategy }

    this.opts = { exchange, symbol, strategy }
    this.orderStore.addSymbol(this.storeOpts)

    this.orderPollInterval = orderPollInterval
  }

  get wallet() {
    const wallet = this.walletStore.getWallet(this.opts)
    logger.verbose(`Available wallet-size on ${this.opts.exchange} (Asset: ${wallet.asset}/Currency: ${wallet.currency}).`)
    return wallet
  }

  public async executeBuy(quote: number) {
    const { exchange, symbol } = this.opts
    logger.debug(`Executing buy order on ${exchange}.${symbol} with: ${quote}`)

    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote)

    const purchasingPower = this.exchangeProvider.priceToPrecision(exchange, symbol, this.wallet.currency)
    const amount = this.exchangeProvider.amountToPrecision(purchasingPower / price)

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'buy' }

    const order = await this.placeOrder(orderOpts)
    if (!order) return

    await this.checkOrder(order.id)
  }

  public async executeSell(quote: number) {
    const { exchange, symbol } = this.opts
    logger.debug(`Executing sell order on ${exchange}.${symbol} with: ${quote}`)

    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote)
    const amount = this.exchangeProvider.amountToPrecision(this.wallet.asset)

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'sell' }

    const order = await this.placeOrder(orderOpts)
    if (!order) return

    await this.checkOrder(order.id)
  }

  public async placeOrder(orderOpts: OrderOpts) {
    const { exchange } = this.opts
    const { symbol, side, type, price, amount } = orderOpts
    const { min } = this.exchangeProvider.getLimits(exchange, symbol).amount
    if (amount < min) {
      logger.error(`Insufficient Funds in Wallet to place an minSize-order of ${amount}! (Min: ${min})`)
      return false
    }

    logger.info(`Placing a ${type} ${side}-order of ${amount} at ${price}.`)

    try {
      const order = await this.exchangeProvider.placeOrder(exchange, orderOpts)
      if (!order || !order.id) return false

      await this.orderStore.newOrder(this.storeOpts, order)

      return order
    } catch (e) {
      // No Monies!! Decrement wallet
      if (e instanceof InsufficientFunds) return
      logger.error(`Order failed. Exchange returned: ${e.message}`)
      return false
    }
  }

  async cancelOrder(id: string) {
    const savedOrder = this.orderStore.getOpenOrder(this.storeOpts, id)
    const { exchange, symbol, strategy } = this.opts
    try {
      this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.PENDING_CANCEL)
      await this.exchangeProvider.cancelOrder(exchange, id)
      this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.CANCELED)

      eventBus.get(EVENT.ORDER_CANCEL)(exchange)(symbol)(strategy)(id).emit({ savedOrder })
    } catch (e) {
      if (e instanceof OrderNotFound) {
        this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.DONE)
        return false
      }
      this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.CANCELED)
    }
    return true
  }

  public async checkOrder(id: string) {
    await sleep(this.orderPollInterval)

    const { exchange, symbol, strategy } = this.opts
    const savedOrder = cloneDeep(this.orderStore.getOpenOrder(this.storeOpts, id))
    const [err, update] = await asyncWrap(this.exchangeProvider.checkOrder(exchange, id, symbol))

    if (err && err instanceof OrderNotFound) return eventBus.get(EVENT.ORDER_CANCEL)(exchange)(symbol)(strategy)(id).emit({ savedOrder })

    this.updateOrder(update)

    switch (update.status) {
      case 'open':
        eventBus.get(EVENT.ORDER_PARTIAL)(exchange)(symbol)(strategy)(id).emit({ savedOrder, update })
        return this.checkOrder(id)
      case 'closed':
        eventBus.get(EVENT.ORDER_COMPLETE)(exchange)(symbol)(strategy)(id).emit({ savedOrder, update })
        break
      case 'canceled':
        eventBus.get(EVENT.ORDER_CANCEL)(exchange)(symbol)(strategy)(id).emit({ savedOrder, update })
        break
    }

    this.orderStore.closeOpenOrder(this.storeOpts, id)
  }

  private async updateOrder(order: OrderWithTrades) {
    this.orderStore.updateOrder(this.storeOpts, order)
    await this.orderStore.saveOrder(this.storeOpts, order)
  }
}
