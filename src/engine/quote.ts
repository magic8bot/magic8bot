import n from 'numbro'
import { Exchange } from './exchange'

export interface QuoteResponse {
  bid: number
  ask: number
}

export class Quote {
  static async getQuote(exchange: Exchange, product_id) {
    return await exchange.getQuote({ product_id })
  }

  static nextBuyForQuote({ bid }, increment, markdown_buy_pct) {
    // @ts-ignore
    return n(bid)
      .subtract(n(bid).multiply(markdown_buy_pct / 100))
      .format(increment, Math.floor)
  }

  static nextSellForQuote({ ask }, increment, markup_sell_pct) {
    // @ts-ignore
    return n(ask)
      .add(n(ask).multiply(markup_sell_pct / 100))
      .format(increment, Math.ceil)
  }
}
