import n from 'numbro'
import { ExchangeService } from '@services'
import { Selector } from '@util'
import { Product } from '@m8bTypes'

interface Balance {
  asset: number
  assetHold: number
  currency: number
  currencyHold: number
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
    private readonly exchange: ExchangeService,
    private readonly selector: Selector,
    private readonly product: Product,
    private readonly markdown: number,
    private readonly markup: number,
    private readonly share: number
  ) {}

  public async buy(isTaker = false) {
    const bid = await this.quote('buy')
    // @ts-ignore
    const quote = n(bid)
      .subtract(n(bid).multiply(this.markdown / 100))
      .format(this.product.increment, Math.floor)
  }

  public async sell() {
    const bid = await this.quote('sell')
    // @ts-ignore
    const quote = n(bid)
      .add(n(bid).multiply(this.markup / 100))
      .format(this.product.increment, Math.floor)
  }

  private async quote(type: OrderType) {
    const { productId } = this.selector
    const { bid, ask } = await this.exchange.getQuote({ productId })
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
          (isNaN(Number(balance.currencyHold)) ? 0 : Number(balance.currencyHold))
      : (isNaN(Number(balance.asset)) ? 0 : Number(balance.asset)) +
          (isNaN(Number(balance.assetHold)) ? 0 : Number(balance.assetHold))
  }
}
