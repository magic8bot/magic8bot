import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { WalletStore, OrderStore, ORDER_STATE } from '@stores'
import { EVENT, eventBus, OrderWithTrades, Adjustment } from '@lib'
import { ExchangeProvider, OrderOpts } from '@exchange'
import { StrategyConf } from '@m8bTypes'
import { QuoteEngine } from './quote'
import { sleep } from '@util'
import { OrderNotFound } from 'ccxt'
import { logger } from '../util/logger'

export class OrderEngine {
  private opts: {
    exchange: string
    symbol: string
    strategy: string
  }
  private quoteEngine: QuoteEngine

  private emitWalletAdjusment: EventBusEmitter<Adjustment>
  private orderStore: OrderStore

  private orderPollInterval: number

  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly walletStore: WalletStore, strategyConf: StrategyConf, exchange: string, symbol: string) {
    const { markUp, markDn } = strategyConf
    this.quoteEngine = new QuoteEngine(this.exchangeProvider, exchange, symbol, markUp, markDn)

    this.opts = { exchange, symbol, strategy: strategyConf.strategyName }
    this.orderStore = new OrderStore(this.opts)

    this.orderPollInterval = strategyConf.orderPollInterval

    this.emitWalletAdjusment = eventBus.get(EVENT.WALLET_ADJUST)(exchange)(symbol)(strategyConf.strategyName).emit

    const panicListner: EventBusListener<void> = eventBus.get(EVENT.PANIC).listen

    panicListner(() => {
      //
    })
  }

  get wallet() {
    const wallet = this.walletStore.getWallet(this.opts)
    logger.info({ wallet })
    return wallet
  }

  public async executeBuy(quote?: number, strength = 1) {
    const { exchange, symbol } = this.opts
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote ? quote : await this.quoteEngine.getBuyPrice())

    const purchasingPower = this.exchangeProvider.priceToPrecision(exchange, symbol, this.wallet.currency * strength)
    const amount = this.exchangeProvider.amountToPrecision((purchasingPower / price) * 0.995)
    // console.log({ price, amount, purchasingPower })
    // process.exit()

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'buy' }

    const order = await this.placeOrder(orderOpts)
    if (!order) return

    const { id } = order
    this.emitWalletAdjusment({ asset: 0, currency: -(amount * price), type: 'newOrder' })

    await this.checkOrder(id)
  }

  public async executeSell(quote?: number, strength = 1) {
    const { exchange, symbol } = this.opts
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote ? quote : await this.quoteEngine.getSellPrice())

    const amount = this.exchangeProvider.amountToPrecision(this.wallet.asset * strength)

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'sell' }

    const order = await this.placeOrder(orderOpts)
    if (!order) return

    const { id } = order
    this.emitWalletAdjusment({ asset: -amount, currency: 0, type: 'newOrder' })

    await this.checkOrder(id)
  }

  private async placeOrder(orderOpts: OrderOpts) {
    logger.info('Placing order:', orderOpts)

    const { exchange } = this.opts
    const order = await this.exchangeProvider.placeOrder(exchange, orderOpts)
    if (!order || !order.id) return false

    await this.orderStore.newOrder(order)

    return order
  }

  private async checkOrder(id: string) {
    await sleep(this.orderPollInterval)

    const { exchange } = this.opts
    const order = await this.exchangeProvider.checkOrder(exchange, id)

    await this.updateOrder(order)

    return order.status === 'open' ? this.adjustOrder(id) : this.orderStore.closeOpenOrder(id)
  }

  private async updateOrder(order: OrderWithTrades) {
    this.adjustWallet(order)

    this.orderStore.updateOrder(order)
    await this.orderStore.saveOrder(order)
  }

  private adjustWallet(order: OrderWithTrades) {
    // @todo(notVitaliy): Adjust for fees
    const openOrder = this.orderStore.getOpenOrder(order.id)
    const adjustment = { asset: 0, currency: 0 }

    if (order.side === 'buy') {
      adjustment.asset = order.filled - openOrder.filled
    } else {
      adjustment.currency = order.cost - openOrder.cost
    }

    if (adjustment.asset || adjustment.currency) this.emitWalletAdjusment({ ...adjustment, type: 'fillOrder' })
  }

  private async adjustOrder(id: string) {
    const { price, side } = this.orderStore.getOpenOrder(id)
    const { exchange, symbol } = this.opts

    const rawQuote = side === 'buy' ? await this.quoteEngine.getBuyPrice() : await this.quoteEngine.getSellPrice()
    const quote = this.exchangeProvider.priceToPrecision(exchange, symbol, rawQuote)

    // Order slipped
    if (Number(quote) !== Number(price)) {
      await this.cancelOrder(id)
      return side === 'buy' ? this.executeBuy(quote) : this.executeSell(quote)
    }

    return this.checkOrder(id)
  }

  private async cancelOrder(id: string) {
    const { price, side, remaining } = this.orderStore.getOpenOrder(id)
    const { exchange } = this.opts
    try {
      this.orderStore.updateOrderState(id, ORDER_STATE.PENDING_CANCEL)
      await this.exchangeProvider.cancelOrder(exchange, id)
      this.orderStore.updateOrderState(id, ORDER_STATE.CANCELED)

      // Refund the wallet
      const adjustment = side === 'buy' ? { asset: 0, currency: price * remaining } : { asset: remaining, currency: 0 }
      this.emitWalletAdjusment({ ...adjustment, type: 'cancelOrder' })
    } catch (e) {
      if (e instanceof OrderNotFound) {
        this.orderStore.updateOrderState(id, ORDER_STATE.DONE)
      } else {
        this.orderStore.updateOrderState(id, ORDER_STATE.CANCELED)
      }
    }
  }
}
