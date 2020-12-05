import { EventBusEmitter, EventBusNode, EventBusListener } from '@magic8bot/event-bus'

import { ExchangeProvider, OrderOpts } from '../exchange'
import { StrategyConfig, Wallet, Adjustment, eventBus, EVENT } from '../lib'
import { OrderEngine, QuoteEngine } from '../engine'
import { WalletStore } from '../store'
import { SIGNAL } from '../types'
import { Order } from 'ccxt'
import { logger } from '../util'

interface OnEventType {
  savedOrder: Order
  update: Order
}

export class Position {
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

  open(signal: SIGNAL) {
    switch (signal) {
      case SIGNAL.OPEN_LONG:
        this.openLong()
        break
      case SIGNAL.CLOSE_LONG:
        break
      case SIGNAL.OPEN_SHORT:
        this.openShort()
        break
      case SIGNAL.CLOSE_SHORT:
        break
    }
  }

  async openLong() {
    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy} opening new long position`)

    const quote = await this.quoteEngine.getBuyPrice()
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote * 0.9)

    const amount = this.getPurchasePower(price)

    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'buy' }
    const order = await this.orderEngine.placeOrder(orderOpts)

    if (!order) return this.handleOnClose && this.handleOnClose()

    logger.info(`${exchange}.${symbol}.${strategy}.${order.id} opened`)

    this.emitWalletAdjustment({ asset: 0, currency: -(amount * price), type: 'newOrder' })

    this.eventListeners.partial = this.eventBusNodes.partial(order.id).listen(this.onParial)
    this.eventListeners.complete = this.eventBusNodes.complete(order.id).listen(this.onComplete)
    this.eventListeners.cancel = this.eventBusNodes.cancel(order.id).listen(this.onCancel)

    this.orderEngine.checkOrder(order.id)
  }

  closeLong() {
    // Do something
  }

  openShort() {
    if (!this.strategyConfig.allowShorts) return
    // @todo(notVitaliy): Implement short selling
  }

  closeShort() {
    // Do nothing
  }

  onClose(fn: () => void) {
    this.handleOnClose = () => {
      this.stopListen()
      this.handleOnClose = null
      fn()
    }
  }

  private onParial = ({ savedOrder, update }: OnEventType) => {
    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy}.${savedOrder.id} updated`)

    const adjustment = { asset: 0, currency: 0 }

    if (update.side === 'buy') adjustment.asset = update.filled - savedOrder.filled
    else adjustment.currency = update.cost - savedOrder.cost

    if (adjustment.asset || adjustment.currency) this.emitWalletAdjustment({ ...adjustment, type: 'fillOrder' })

    const savedFee = savedOrder.fee ? savedOrder.fee.cost : 0
    if (update.fee && update.fee.cost && update.fee.cost - savedFee > 0) this.emitWalletAdjustment({ asset: 0, currency: 0 - (update.fee.cost - savedFee), type: 'fee' })
  }

  private onComplete = ({ savedOrder, update }: OnEventType) => {
    this.onParial({ savedOrder, update })
    this.stopListen()

    const { exchange, symbol, strategy } = this.strategyConfig
    logger.info(`${exchange}.${symbol}.${strategy}.${savedOrder.id} completed`)

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

    if (!this.wallet.asset && this.handleOnClose) this.handleOnClose()
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
}
