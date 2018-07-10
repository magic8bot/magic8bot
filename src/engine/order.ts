import n from 'numbro'
import { Exchange } from './exchange'
import { Selector } from '../util'
import { Product } from '@zbTypes'

interface Balance {
  asset: number
  asset_hold: number
  currency: number
  currency_hold: number
}

enum ORDER_STATUS {
  PENDING,
  LIVE,
  CANCELED,
  FAILED,
  PARTIAL,
  DONE,
}

type OrderType = 'buy' | 'sell'

export class Orders {
  private openOrders: any[] = []

  constructor(
    private readonly exchange: Exchange,
    private readonly selector: Selector,
    private readonly product: Product,
    private readonly markdown: number,
    private readonly markup: number,
    private readonly share: number
  ) {}

  async buy(isTaker: boolean = false) {
    const bid = await this.quote('buy')
    // @ts-ignore
    const quote = n(bid)
      .subtract(n(bid).multiply(this.markdown / 100))
      .format(this.product.increment, Math.floor)
  }

  async sell() {
    const bid = await this.quote('sell')
    // @ts-ignore
    const quote = n(bid)
      .add(n(bid).multiply(this.markup / 100))
      .format(this.product.increment, Math.floor)
  }

  private async quote(type: OrderType) {
    const { product_id } = this.selector
    const { bid, ask } = await this.exchange.getQuote({ product_id })
    return type === 'buy' ? bid : ask
  }

  private async getSize(type: OrderType, quote: number) {
    const { asset, currency } = this.selector
    const opts = { asset, currency }
    const balance = await this.exchange.getBalance(opts)
  }

  private getFee(isTaker: boolean) {
    return isTaker ? this.exchange.takerFee : this.exchange.makerFee
  }

  private getWalletTotal(type: OrderType, balance: Balance) {
    return type === 'buy'
      ? (isNaN(Number(balance.currency)) ? 0 : Number(balance.currency)) +
          (isNaN(Number(balance.currency_hold)) ? 0 : Number(balance.currency_hold))
      : (isNaN(Number(balance.asset)) ? 0 : Number(balance.asset)) +
          (isNaN(Number(balance.asset_hold)) ? 0 : Number(balance.asset_hold))
  }
}
