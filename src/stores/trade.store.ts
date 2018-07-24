import { dbDriver, TradeItem, eventBus, EventBusEmitter, EVENT } from '@lib'

export class TradeStore {
  public tradesMap: Map<string, Set<TradeItem>> = new Map()
  private emitters: Map<string, EventBusEmitter> = new Map()

  public addSelector(exchange: string, selector: string) {
    const idStr = this.makeIdStr(exchange, selector)
    if (this.tradesMap.has(idStr)) return

    this.tradesMap.set(idStr, new Set())
    this.emitters.set(idStr, eventBus.register({ event: EVENT.TRADE, exchange, selector }))
  }

  public async loadTrades(exchange: string, selector: string) {
    const idStr = this.makeIdStr(exchange, selector)
    const trades = await dbDriver.trade
      .find({ selector })
      .sort({ time: 1 })
      .toArray()

    this.tradesMap.set(idStr, new Set(trades))
  }

  public async update(exchange: string, selector: string, newTrades: TradeItem[]) {
    await dbDriver.trade.insertMany(newTrades.map((trade) => ({ ...trade, exchange, selector })))

    const idStr = this.makeIdStr(exchange, selector)
    if (!this.tradesMap.has(idStr)) this.tradesMap.set(idStr, new Set())

    const trades = this.tradesMap.get(idStr)

    newTrades.forEach((trade) => {
      trades.add(trade)
      this.emitters.get(idStr)(trade)
    })
  }

  private makeIdStr(exchange: string, selector: string) {
    return `${exchange}.${selector}`
  }
}
