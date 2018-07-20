import n from 'numbro'
import { ExchangeService } from '@services'

export interface QuoteResponse {
  bid: number
  ask: number
}

export class Quote {
  public static async getQuote(exchange: ExchangeService, productId: string) {
    return exchange.getQuote({ productId })
  }

  public static nextBuyForQuote({ bid }, increment: number, markdownBuyPct: number) {
    // @ts-ignore
    return n(bid)
      .subtract(n(bid).multiply(markdownBuyPct / 100))
      .format(increment, Math.floor)
  }

  public static nextSellForQuote({ ask }, increment: number, markupSellPct: number) {
    // @ts-ignore
    return n(ask)
      .add(n(ask).multiply(markupSellPct / 100))
      .format(increment, Math.ceil)
  }
}
