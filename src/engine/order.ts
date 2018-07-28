import { WalletStore, WalletOpts, OrderStore } from '@stores'
import { EventBusEmitter, EVENT, eventBus } from '@lib'
import { ExchangeProvider, OrderOpts } from '@exchange'
import { StrategyConf } from '@m8bTypes'
import { QuoteEngine } from './quote'

export class OrderEngine {
  private opts: {
    exchange: string
    symbol: string
    strategy: string
  }
  private quoteEngine: QuoteEngine

  private emitters: Map<EVENT, EventBusEmitter> = new Map()
  private orderStore: OrderStore

  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly walletStore: WalletStore,
    strategyConf: StrategyConf,
    exchange: string,
    symbol: string
  ) {
    this.opts = { exchange, symbol, strategy: strategyConf.strategyName }
    this.quoteEngine = new QuoteEngine(this.exchangeProvider, exchange, symbol)
    this.orderStore = new OrderStore(this.opts)

    this.emitters.set(EVENT.ORDER_START, eventBus.register({ event: EVENT.ORDER_START, ...this.opts }))

    this.emitters.set(EVENT.ORDER_CANCEL, eventBus.register({ event: EVENT.ORDER_CANCEL, ...this.opts }))

    this.emitters.set(EVENT.ORDER_COMPLETE, eventBus.register({ event: EVENT.ORDER_COMPLETE, ...this.opts }))

    this.emitters.set(EVENT.ORDER_PARTIAL, eventBus.register({ event: EVENT.ORDER_PARTIAL, ...this.opts }))
  }

  get wallet() {
    return this.walletStore.getWallet(this.opts)
  }

  public async executeBuy() {
    const { symbol } = this.opts
    const price = this.quoteEngine.getBuyPrice()
    const amount = price / this.wallet.currency
    const orderOpts = { symbol, price, amount, type: 'market', side: 'buy' } as OrderOpts

    await this.placeOrder(orderOpts)
  }

  public async executeSell() {
    const { symbol } = this.opts
    const price = this.quoteEngine.getSellPrice()
    const amount = price * this.wallet.asset
    const orderOpts = { symbol, price, amount, type: 'market', side: 'sell' } as OrderOpts

    await this.placeOrder(orderOpts)
  }

  private async placeOrder(orderOpts: OrderOpts) {
    const { exchange } = this.opts
    const order = await this.exchangeProvider.placeOrder(exchange, orderOpts)
    this.orderStore.newOrder(order)
  }
}
