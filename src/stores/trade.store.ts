import { dbDriver, TradeItem } from '@lib'

export class TradeStore {
  public tradesMap: Map<string, TradeItem[]> = new Map()

  public addSelector(selector: string) {
    if (this.tradesMap.has(selector)) return

    this.tradesMap.set(selector, [])
  }

  public async loadTrades(selector: string) {
    const trades = await dbDriver.trade
      .find({ selector })
      .sort({ time: 1 })
      .toArray()

    this.tradesMap.set(selector, trades)
  }

  public async update(selector: string, newTrades: TradeItem[]) {
    await dbDriver.trade.insertMany(newTrades.map((trade) => ({ ...trade, selector })))

    if (!this.tradesMap.has(selector)) this.tradesMap.set(selector, [])
    const trades = this.tradesMap.get(selector)

    newTrades.forEach((trade) => trades.push(trade))
    this.tradesMap.set(selector, trades)
  }
}
