import { ExchangeProvider } from '@exchange'

interface QuoteEngineOpts {
  exchange: string
  symbol: string
  markUp: number
  markDn: number
}

export class QuoteEngine {
  constructor(private readonly exchangeProvider: ExchangeProvider, private readonly opts: QuoteEngineOpts) {}

  public async getBuyPrice() {
    // prettier-ignore
    const { bids: [[quote]] } = await this.orderBook()

    const markDn = quote * this.opts.markDn
    return quote - markDn
  }

  public async getSellPrice() {
    // prettier-ignore
    const { asks: [[quote]] } = await this.orderBook()

    const markUp = quote * this.opts.markUp
    return quote + markUp
  }

  private async orderBook() {
    return this.exchangeProvider.getOrderbook(this.opts.exchange, this.opts.symbol)
  }
}
