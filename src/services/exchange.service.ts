import { Trade, Quote, Product, ExchangeAuth } from '@m8bTypes'
import { loadExchange } from '@plugins'

interface BaseOpts {
  asset: string
  currency: string
}

export interface ProductOpts {
  productId: string
  to?: number
  from?: number
}

type FeeOpts = BaseOpts
type BalanceOpts = BaseOpts

type TradesOpts = {
  to?: number
  from?: number
} & ProductOpts

export type TradeOpts = {
  price: number
  size: number
  post_only: boolean
  cancel_after?: string
  order_type?: string
} & ProductOpts

interface OrderOpts {
  order_id: string
}

type CancelOpts = OrderOpts

interface Exchange {
  name: string
  historyScan: 'backward' | 'forward'
  makerFee: number
  takerFee: number
  backfillRateLimit: number
  dynamicFees: boolean
  makerBuy100Workaround: boolean

  getProducts: () => any
  getTrades: (opts: TradesOpts, cb: any) => void
  getQuote: (opts: ProductOpts, cb: any) => void
  buy: (opts: TradeOpts, cb: any) => void
  sell: (opts: TradeOpts, cb: any) => void
  getCursor: (trade: any) => any
  setFees: (opts: FeeOpts) => void
  getBalance: (opts: BalanceOpts, cb: any) => void
  cancelOrder: (opts: CancelOpts, cb: any) => void
  getOrder: (opts: OrderOpts, cb: any) => void
}

export class ExchangeService {
  private readonly exchange: Exchange

  constructor(exchangeName: string, auth: ExchangeAuth, isPaper = false) {
    const exchange = loadExchange(!isPaper ? exchangeName : 'sim')
    // @todo(notVitaliy): Fix paper trader
    this.exchange = !isPaper ? exchange(auth) : exchange(auth)
  }

  get name() {
    return this.exchange.name.toUpperCase()
  }

  get dynamicFees() {
    return this.exchange.dynamicFees
  }

  get historyScan() {
    return this.exchange.historyScan
  }

  get makerFee() {
    return this.exchange.makerFee
  }

  get takerFee() {
    return this.exchange.takerFee
  }

  get backfillRateLimit() {
    return this.exchange.backfillRateLimit
  }

  get makerBuy100Workaround() {
    return this.exchange.makerBuy100Workaround
  }

  public setFees(opts: FeeOpts) {
    this.exchange.setFees(opts)
  }

  public getProducts(): Product[] {
    return this.exchange.getProducts()
  }

  public getCursor(trade) {
    return this.exchange.getCursor(trade)
  }

  public async getTrades(opts: TradesOpts) {
    return new Promise<Trade[]>((resolve, reject) => {
      this.exchange.getTrades(opts, (err, trades) => (err ? reject(err) : resolve(trades)))
    })
  }

  public async getQuote(opts: ProductOpts) {
    return new Promise<Quote>((resolve, reject) => {
      this.exchange.getQuote(opts, (err, quote) => (err ? reject(err) : resolve(quote)))
    })
  }

  public async buy(opts: TradeOpts) {
    return new Promise<Record<string, any>>((resolve, reject) => {
      this.exchange.buy(opts, (err, apiOrder) => (err ? reject(err) : resolve(apiOrder)))
    })
  }

  public async sell(opts: TradeOpts) {
    return new Promise<Record<string, any>>((resolve, reject) => {
      this.exchange.sell(opts, (err, apiOrder) => (err ? reject(err) : resolve(apiOrder)))
    })
  }

  public async getBalance(opts: BalanceOpts) {
    return new Promise<{ asset: number }>((resolve, reject) =>
      this.exchange.getBalance(opts, (err, balance) => (err ? reject(err) : resolve(balance)))
    )
  }

  public async cancelOrder(opts: OrderOpts) {
    await new Promise((resolve) => this.exchange.cancelOrder(opts, () => resolve()))

    return this.getOrder(opts)
  }

  public async getOrder(opts: OrderOpts) {
    return new Promise<Record<string, any>>((resolve, reject) =>
      this.exchange.getOrder(opts, (err, apiOrder) => (err ? reject(err) : resolve(apiOrder)))
    )
  }

  public async placeOrder(type: 'buy' | 'sell', opts: TradeOpts) {
    return type === 'buy' ? this.buy(opts) : this.sell(opts)
  }
}
