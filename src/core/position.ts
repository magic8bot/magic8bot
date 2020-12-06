import { Order } from 'ccxt'

import { EventBusEmitter, EventBusNode } from '@magic8bot/event-bus'

import { ExchangeProvider, OrderOpts } from '../exchange'
import { StrategyConfig, Wallet, Adjustment, eventBus, EVENT } from '../lib'
import { OrderEngine, QuoteEngine } from '../engine'
import { WalletStore } from '../store'
import { SIGNAL } from '../types'
import { logger, sleep } from '../util'

interface OnEventType {
  savedOrder: Order
  update: Order
}

enum POSITION_STATE {
  NEW = 'NEW',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export class Position {
  private state: POSITION_STATE = POSITION_STATE.NEW

  private emitWalletAdjustment: EventBusEmitter<Adjustment>
  private orderEngine: OrderEngine
  private quoteEngine: QuoteEngine
  private wallet: Wallet

  private handleOnClose: () => void = null

  private eventBusNodes: {
    partial: EventBusNode
    complete: EventBusNode
    cancel: EventBusNode
  } = {
    partial: null,
    complete: null,
    cancel: null,
  }

  private eventListeners: {
    partial: () => void
    complete: () => void
    cancel: () => void
  } = {
    partial: null,
    complete: null,
    cancel: null,
  }

  private slPrice: number = null
  private tpPrice: number = null

  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly strategyConfig: StrategyConfig) {
    const { exchange, symbol, strategy } = this.strategyConfig
    this.emitWalletAdjustment = eventBus.get(EVENT.WALLET_ADJUST)(exchange)(symbol)(strategy).emit

    this.eventBusNodes.partial = eventBus.get(EVENT.ORDER_PARTIAL)(exchange)(symbol)(strategy)
    this.eventBusNodes.complete = eventBus.get(EVENT.ORDER_COMPLETE)(exchange)(symbol)(strategy)
    this.eventBusNodes.cancel = eventBus.get(EVENT.ORDER_CANCEL)(exchange)(symbol)(strategy)

    this.orderEngine = new OrderEngine(this.exchangeProvider, this.strategyConfig)
    this.quoteEngine = new QuoteEngine(this.exchangeProvider, this.strategyConfig)

    this.wallet = WalletStore.instance.getWallet(strategyConfig)
  }

  processSignal(signal: SIGNAL, data?: Record<string, any>) {
    const { limitOrderPriceOffset } = data

    switch (signal) {
      case SIGNAL.OPEN_LONG:
        if (this.state !== POSITION_STATE.NEW) break
        this.openLong(limitOrderPriceOffset)
        break
      case SIGNAL.OPEN_SHORT:
        if (this.state !== POSITION_STATE.NEW) break
        this.openShort()
        break
      case SIGNAL.CLOSE_LONG:
        if (this.state !== POSITION_STATE.OPEN) break
        this.closeLong()
        break
      case SIGNAL.CLOSE_SHORT:
        if (this.state !== POSITION_STATE.OPEN) break
        this.closeShort()
        break
    }
  }

  onClose(fn: () => void) {
    this.handleOnClose = () => {
      this.stopListen()
      this.handleOnClose = null
      fn()
    }
  }

  private async openLong(limitOrderPriceOffset: number) {
    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy} opening new long position`)

    const quote = await this.quoteEngine.getBuyPrice()
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote)

    if (limitOrderPriceOffset) this.setExitPrices(quote, limitOrderPriceOffset)

    const amount = this.getPurchasePower(price)

    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'buy' }
    const order = await this.orderEngine.placeOrder(orderOpts)

    if (!order) return this.handleOnClose && this.handleOnClose()

    this.state = POSITION_STATE.OPEN

    logger.info(`${exchange}.${symbol}.${strategy}.${order.id} opened`)

    this.emitWalletAdjustment({ asset: 0, currency: -(amount * price), type: 'newOrder' })
    this.watchOrder(order)
  }

  private async closeLong(preQuote?: number) {
    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy} closing long position`)

    const quote = preQuote ? preQuote : await this.quoteEngine.getSellPrice()

    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote)
    const amount = this.exchangeProvider.amountToPrecision(this.wallet.asset)

    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'sell' }

    const order = await this.orderEngine.placeOrder(orderOpts)

    if (!order) {
      await sleep(10)
      return this.closeLong()
    }

    this.state = POSITION_STATE.CLOSED

    this.emitWalletAdjustment({ asset: this.wallet.asset, currency: 0, type: 'newOrder' })
    this.watchOrder(order)
  }

  private openShort() {
    if (!this.strategyConfig.allowShorts) return
    // @todo(notVitaliy): Implement short selling
  }

  private closeShort() {
    // Do nothing
  }

  private watchOrder(order: Order) {
    this.eventListeners.partial = this.eventBusNodes.partial(order.id).listen(this.onParial)
    this.eventListeners.complete = this.eventBusNodes.complete(order.id).listen(this.onComplete)
    this.eventListeners.cancel = this.eventBusNodes.cancel(order.id).listen(this.onCancel)

    this.orderEngine.checkOrder(order.id)
  }

  private onParial = ({ savedOrder, update }: OnEventType) => {
    const adjustment = { asset: 0, currency: 0 }

    if (update.side === 'buy') adjustment.asset = update.filled - savedOrder.filled
    else adjustment.currency = update.cost - savedOrder.cost

    if (adjustment.asset || adjustment.currency) this.emitWalletAdjustment({ ...adjustment, type: 'fillOrder' })

    const savedFee = savedOrder.fee ? savedOrder.fee.cost : 0
    if (update.fee && update.fee.cost && update.fee.cost - savedFee > 0) this.emitWalletAdjustment({ asset: 0, currency: 0 - (update.fee.cost - savedFee), type: 'fee' })
  }

  private onComplete = async ({ savedOrder, update }: OnEventType) => {
    this.onParial({ savedOrder, update })
    this.stopListen()

    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy}.${savedOrder.id} completed`)

    await this.getFees(update)

    if (savedOrder.side === 'sell') return this.handleOnClose()

    this.checkPrice()
    // @todo(notVitaliy): Implement stop-loss / take-profits here
  }

  private onCancel = ({ savedOrder }: OnEventType) => {
    this.stopListen()
    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy}.${savedOrder.id} canceled`)

    const { side, price, remaining } = savedOrder

    const currency = side === 'buy' ? price * remaining : 0
    const asset = side === 'buy' ? 0 : remaining

    const adjustment = { asset, currency }

    this.emitWalletAdjustment({ ...adjustment, type: 'cancelOrder' })

    if (!this.wallet.asset && this.handleOnClose) {
      this.handleOnClose()
      this.state = POSITION_STATE.CLOSED
    }
  }

  private stopListen() {
    Object.keys(this.eventListeners).forEach((key) => {
      if (!this.eventListeners[key]) return
      this.eventListeners[key]()
      this.eventListeners[key] = null
    })
  }

  private getPurchasePower(price: number) {
    const { exchange, symbol } = this.strategyConfig

    const size = this.wallet.currency * ((Number(this.strategyConfig.sizePercent) || 5) / 100)
    const currency = this.exchangeProvider.priceToPrecision(exchange, symbol, size)

    return this.exchangeProvider.amountToPrecision(currency / price)
  }

  private setExitPrices(quote: number, limitOrderPriceOffset: number) {
    this.slPrice = quote - limitOrderPriceOffset
    this.tpPrice = quote + limitOrderPriceOffset * 1.5
  }

  private async checkPrice() {
    const quote = await this.quoteEngine.getSellPrice()

    console.log(quote, this.tpPrice, this.slPrice)

    if (quote >= this.tpPrice || quote <= this.slPrice) return this.closeLong(quote)

    await sleep(5000)

    this.checkPrice()
  }

  private async getFees(order: Order) {
    const { exchange, symbol } = this.strategyConfig
    const trades = await this.exchangeProvider.getMyTrades(exchange, symbol)

    const orderTrades = trades.filter((trade) => trade.order === order.id)
    const totalFees = orderTrades.reduce(
      (acc, curr) => {
        if (!acc.cost) return { ...curr.fee }
        acc.cost += curr.fee.cost

        return acc
      },
      { cost: null, currency: null }
    )

    const [a] = symbol.split('/')

    const adjustment = { asset: 0, currency: 0 }

    if (totalFees.currency === a) adjustment.asset -= totalFees.cost
    else adjustment.currency -= totalFees.cost

    this.emitWalletAdjustment({ ...adjustment, type: 'fee' })
  }
}
