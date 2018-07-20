import { dbDriver, TradeItem } from '../lib'

export class TradeStore {
  public tradesMap: Map<string, TradeItem[]> = new Map()

  addSelector(selector: string) {
    if (this.tradesMap.has(selector)) return

    this.tradesMap.set(selector, [])
  }

  async loadTrades(selector: string) {
    const trades = await dbDriver.trade
      .find({ selector })
      .sort({ time: 1 })
      .toArray()

    this.tradesMap.set(selector, trades)
  }

  async update(selector: string, newTrades: TradeItem[]) {
    await dbDriver.trade.insertMany(newTrades)

    const trades = !this.tradesMap.has(selector) ? [] : this.tradesMap.get(selector)
    newTrades.forEach((trade) => trades.push(trade))
    this.tradesMap.set(selector, trades)
  }
}
