import { ExchangeProvider } from '@exchange'
import { logger } from '../util'

export class QuoteEngine {
  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly exchange: string,
    private readonly symbol: string,
    private readonly markUp: number = 0,
    private readonly markDn: number = 0
  ) {}

  public async getBuyPrice() {
    // prettier-ignore
    const { bids: [[quote]] } = await this.orderBook()

    const markDn = quote * this.markDn
    return quote - markDn
  }

  public async getSellPrice() {
    // prettier-ignore
    const { asks: [[quote]] } = await this.orderBook()

    const markUp = quote * this.markUp
    return quote + markUp
  }

  private async orderBook() {
    return this.exchangeProvider.getOrderbook(this.exchange, this.symbol)
  }
}
