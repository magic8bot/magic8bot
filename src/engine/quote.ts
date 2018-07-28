import { ExchangeProvider } from '@exchange'

export class QuoteEngine {
  constructor(
    private readonly exchangeProvider: ExchangeProvider,
    private readonly exchange: string,
    private readonly symbol: string
  ) {}

  public getBuyPrice() {
    return 5
  }

  public getSellPrice() {
    return 5
  }
}
