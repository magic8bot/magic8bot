import { Trade } from 'ccxt'
import { dbDriver, eventBus, EventBusEmitter, EVENT } from '@lib'

export class TradeStore {
  public tradesMap: Map<string, Set<Trade>> = new Map()
  private emitters: Map<string, EventBusEmitter> = new Map()

  public addSymbol(exchange: string, symbol: string) {
    const idStr = this.makeIdStr(exchange, symbol)
    if (this.tradesMap.has(idStr)) return

    this.tradesMap.set(idStr, new Set())
    this.emitters.set(idStr, eventBus.register({ event: EVENT.XCH_TRADE, exchange, symbol }))
  }

  public async loadTrades(exchange: string, symbol: string) {
    const idStr = this.makeIdStr(exchange, symbol)
    const trades = await dbDriver.trade
      .find({ symbol })
      .sort({ time: 1 })
      .toArray()

    this.tradesMap.set(idStr, new Set(trades))
  }

  public async update(exchange: string, symbol: string, newTrades: Trade[]) {
    await dbDriver.trade.insertMany(newTrades.map((trade) => ({ ...trade, exchange, symbol })))

    const idStr = this.makeIdStr(exchange, symbol)
    if (!this.tradesMap.has(idStr)) this.tradesMap.set(idStr, new Set())

    const trades = this.tradesMap.get(idStr)

    newTrades.forEach((trade) => {
      trades.add(trade)
      this.emitters.get(idStr)(trade)
    })
  }

  private makeIdStr(exchange: string, symbol: string) {
    return `${exchange}.${symbol}`
  }
}
