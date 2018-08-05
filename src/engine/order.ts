import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { WalletStore, OrderStore } from '@stores'
import { EVENT, eventBus, OrderWithTrades, Adjustment, TradeWithFee } from '@lib'
import { ExchangeProvider, OrderOpts } from '@exchange'
import { StrategyConf } from '@m8bTypes'
import { QuoteEngine } from './quote'
import { sleep } from '@util'

export class OrderEngine {
  private opts: {
    exchange: string
    symbol: string
    strategy: string
  }
  private quoteEngine: QuoteEngine

  private adjustWallet: EventBusEmitter<Adjustment>
  private orderStore: OrderStore

  private orderPollInterval: number

  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly walletStore: WalletStore, strategyConf: StrategyConf, exchange: string, symbol: string) {
    const { markUp, markDn } = strategyConf
    this.quoteEngine = new QuoteEngine(this.exchangeProvider, exchange, symbol, markUp, markDn)

    this.opts = { exchange, symbol, strategy: strategyConf.strategyName }
    this.orderStore = new OrderStore(this.opts)

    this.orderPollInterval = strategyConf.orderPollInterval

    this.adjustWallet = eventBus.get(EVENT.WALLET_ADJUST)(exchange)(symbol)(strategyConf.strategyName).emit

    const panicListner: EventBusListener<void> = eventBus.get(EVENT.PANIC).listen

    panicListner(() => {
      //
    })
  }

  get wallet() {
    const wallet = this.walletStore.getWallet(this.opts)
    console.log({ wallet })
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

    const { id } = await this.placeOrder(orderOpts)
    this.adjustWallet({ asset: 0, currency: -(amount * price) })

    await this.checkOrder(id)
  }

  public async executeSell(quote?: number, strength = 1) {
    const { exchange, symbol } = this.opts
    const price = this.exchangeProvider.priceToPrecision(exchange, symbol, quote ? quote : await this.quoteEngine.getSellPrice())

    const amount = this.exchangeProvider.amountToPrecision(this.wallet.asset * strength)

    // @todo(notVitaliy): Add support for market
    const orderOpts: OrderOpts = { symbol, price, amount, type: 'limit', side: 'sell' }

    const { id } = await this.placeOrder(orderOpts)
    this.adjustWallet({ asset: -amount, currency: 0 })

    await this.checkOrder(id)
  }

  private async placeOrder(orderOpts: OrderOpts) {
    console.log('Placing order:', orderOpts)

    const { exchange } = this.opts
    const order = await this.exchangeProvider.placeOrder(exchange, orderOpts)
    await this.orderStore.newOrder(order)

    return order
  }

  private async checkOrder(id: string) {
    await sleep(this.orderPollInterval)

    const { exchange } = this.opts
    const order = await this.exchangeProvider.checkOrder(exchange, id)
    console.log(order)

    await this.updateOrder(order)

    return order.status === 'open' ? this.adjustOrder(id) : this.orderStore.closeOpenOrder(id)
  }

  private async updateOrder(order: OrderWithTrades) {
    const openOrder = this.orderStore.getOpenOrder(order.id)

    const adjustment = { asset: 0, currency: 0 }
    if (order.side === 'buy') {
      adjustment.asset = order.filled - openOrder.filled
    } else {
      adjustment.currency = order.cost - openOrder.cost
    }

    if (adjustment.asset || adjustment.currency) this.adjustWallet(adjustment)
    this.orderStore.updateOrder(order)
    await this.orderStore.saveOrder(order)
  }

  private async adjustOrder(id: string) {
    const { price, side, remaining } = this.orderStore.getOpenOrder(id)
    const { exchange, symbol } = this.opts
    const quote = this.exchangeProvider.priceToPrecision(exchange, symbol, await (side === 'buy' ? this.quoteEngine.getBuyPrice() : this.quoteEngine.getSellPrice()))

    // Order slipped
    if (Number(quote) !== Number(price)) {
      await this.exchangeProvider.cancelOrder(exchange, id)

      // Refund the wallet
      const adjustment = side === 'buy' ? { asset: 0, currency: price * remaining } : { asset: remaining, currency: 0 }
      this.adjustWallet(adjustment)
      return side === 'buy' ? this.executeBuy(quote) : this.executeSell(quote)
    }

    return this.checkOrder(id)
  }

  private calculateAdjustmentFromTrades(trades: TradeWithFee[]) {
    const adjustment = { asset: 0, currency: 0 }
    if (!trades.length) return adjustment

    return trades.reduce((adj, { side, amount, fee, symbol }) => {
      if (side === 'buy') adj.asset += amount
      else adj.currency += amount

      const [asset] = symbol.split('/')
      if (fee.currency === asset) adj.asset -= fee.cost
      else adj.currency -= fee.cost

      return adj
    }, adjustment)
  }
}
