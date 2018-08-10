import { EventBusEmitter } from '@magic8bot/event-bus'
import { WalletStore, OrderStore, ORDER_STATE } from '@store'
import { EVENT, eventBus, OrderWithTrades, Adjustment } from '@lib'
import { ExchangeProvider, OrderOpts } from '@exchange'
import { StrategyConf, StoreOpts } from '@m8bTypes'
import { QuoteEngine } from './quote'
import { sleep } from '@util'
import { OrderNotFound, InsufficientFunds } from 'ccxt'
import { logger } from '../util/logger'

export class OrderEngine {
  private opts: {
    exchange: string
    symbol: string
    strategy: string
  }
  private quoteEngine: QuoteEngine

  private emitWalletAdjustment: EventBusEmitter<Adjustment>

  private orderPollInterval: number
  private orderSlippageAdjustmentTolerance: number

  private strategy: string

  private readonly orderStore = OrderStore.instance
  private readonly walletStore = WalletStore.instance

  private readonly storeOpts: StoreOpts

  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly exchange: string, private readonly symbol: string, strategyConf: StrategyConf) {
    const { markUp, markDn } = strategyConf
    this.quoteEngine = new QuoteEngine(this.exchangeProvider, exchange, symbol, markUp, markDn)
    const strategy = (this.strategy = strategyConf.strategyName)

    this.storeOpts = { exchange, symbol, strategy }

    this.opts = { exchange, symbol, strategy }
    this.orderStore.addSymbol(this.storeOpts)

    this.orderPollInterval = strategyConf.orderPollInterval
    this.orderSlippageAdjustmentTolerance = strategyConf.orderSlippageAdjustmentTolerance

    this.emitWalletAdjustment = eventBus.get(EVENT.WALLET_ADJUST)(exchange)(symbol)(strategy).emit
  }

  get wallet() {
    const wallet = this.walletStore.getWallet(this.opts)
    logger.verbose(`Available wallet-size on ${this.exchange} (Asset: ${wallet.asset}/Currency: ${wallet.currency}).`)
    return wallet
  }

  public async executeBuy(quote?: number, strength = 1) {
    const { exchange, symbol } = this.opts
    const rawPrice = quote ? quote : await this.quoteEngine.getBuyPrice()
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, rawPrice)

    const purchasingPower = this.exchangeProvider.priceToPrecision(exchange, symbol, this.wallet.currency * strength)
    const amount = this.exchangeProvider.amountToPrecision((purchasingPower / price) * 0.995)

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'buy' }
    const adjustment: Adjustment = { asset: 0, currency: -(amount * price), type: 'newOrder' }

    const order = await this.placeOrder(orderOpts, adjustment)
    if (!order) return

    await this.checkOrder(order.id)
  }

  public async executeSell(quote?: number, strength = 1) {
    const { exchange, symbol } = this.opts
    const rawPrice = quote ? quote : await this.quoteEngine.getSellPrice()
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, rawPrice)

    const { min, max } = this.exchangeProvider.limits(exchange, symbol).amount
    let amount = this.exchangeProvider.amountToPrecision(this.wallet.asset * strength)

    if (amount < min) {
      logger.error(`Insufficient Funds in Wallet to place an minSize-order of ${amount}! (Min: ${min})`)
      return
    }
    // prevent order fail, if calculated order is over market limits
    if (amount > max) {
      amount = max
    }

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'sell' }
    const adjustment: Adjustment = { asset: -amount, currency: 0, type: 'newOrder' }

    const order = await this.placeOrder(orderOpts, adjustment)
    if (!order) return

    await this.checkOrder(order.id)
  }

  private async placeOrder(orderOpts: OrderOpts, adjustment: Adjustment) {
    logger.info(`Placing a ${orderOpts.type} ${orderOpts.side}-order of ${orderOpts.amount} at ${orderOpts.price}.`)

    try {
      const { exchange } = this.opts
      const order = await this.exchangeProvider.placeOrder(exchange, orderOpts)
      if (!order || !order.id) return false

      // Great Success! Decrement wallet
      this.emitWalletAdjustment(adjustment)
      await this.orderStore.newOrder(this.storeOpts, order)

      return order
    } catch (e) {
      // No Monies!! Decrement wallet
      if (e instanceof InsufficientFunds) this.emitWalletAdjustment(adjustment)
      logger.error(`Order failed. Exchange returned: ${e.message}`)
      return false
    }
  }

  private async checkOrder(id: string) {
    await sleep(this.orderPollInterval)

    const { exchange } = this.opts
    logger.verbose(`Checking order ${id} on ${exchange}`)
    const order = await this.exchangeProvider.checkOrder(exchange, id)

    await this.updateOrder(order)

    return order.status === 'open' ? this.adjustOrder(id) : this.orderStore.closeOpenOrder(this.storeOpts, id)
  }

  private async updateOrder(order: OrderWithTrades) {
    this.adjustWallet(order)

    this.orderStore.updateOrder(this.storeOpts, order)
    await this.orderStore.saveOrder(this.exchange, order)
  }

  private adjustWallet(order: OrderWithTrades) {
    // @todo(notVitaliy): Adjust for fees
    const openOrder = this.orderStore.getOpenOrder(this.storeOpts, order.id)
    const adjustment = { asset: 0, currency: 0 }

    if (order.side === 'buy') {
      adjustment.asset = order.filled - openOrder.filled
    } else {
      adjustment.currency = order.cost - openOrder.cost
    }

    if (adjustment.asset || adjustment.currency) this.emitWalletAdjustment({ ...adjustment, type: 'fillOrder' })
  }

  private async adjustOrder(id: string) {
    const { price, side } = this.orderStore.getOpenOrder(this.storeOpts, id)
    const { exchange, symbol } = this.opts

    const rawQuote = side === 'buy' ? await this.quoteEngine.getBuyPrice() : await this.quoteEngine.getSellPrice()
    const quote = this.exchangeProvider.priceToPrecision(exchange, symbol, rawQuote)
    const adjustedQuote = side === 'buy' ? quote - this.orderSlippageAdjustmentTolerance : quote + this.orderSlippageAdjustmentTolerance
    const shouldAdjust = side === 'buy' ? price < adjustedQuote : price > adjustedQuote

    // Order slipped
    if (shouldAdjust) {
      if (await this.cancelOrder(id)) return side === 'buy' ? this.executeBuy(quote) : this.executeSell(quote)
      return false
    }

    return this.checkOrder(id)
  }

  private async cancelOrder(id: string) {
    const { price, side, remaining } = this.orderStore.getOpenOrder(this.storeOpts, id)
    const { exchange } = this.opts
    try {
      this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.PENDING_CANCEL)
      await this.exchangeProvider.cancelOrder(exchange, id)
      this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.CANCELED)

      // Refund the wallet
      const adjustment = side === 'buy' ? { asset: 0, currency: price * remaining } : { asset: remaining, currency: 0 }
      this.emitWalletAdjustment({ ...adjustment, type: 'cancelOrder' })
    } catch (e) {
      if (e instanceof OrderNotFound) {
        this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.DONE)
        return false
      }
      this.orderStore.updateOrderState(this.storeOpts, id, ORDER_STATE.CANCELED)
    }
    return true
  }
}
