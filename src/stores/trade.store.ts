import { Trade } from 'ccxt'
import { dbDriver, eventBus, EventBusEmitter, EVENT } from '@lib'

export class TradeStore {
  public tradesMap: Map<string, number> = new Map()
  private emitters: Map<string, EventBusEmitter> = new Map()

  public addSymbol(exchange: string, symbol: string) {
    const idStr = this.makeIdStr(exchange, symbol)
    if (this.tradesMap.has(idStr)) return

    this.tradesMap.set(idStr, 0)
    this.emitters.set(idStr, eventBus.register({ event: EVENT.XCH_TRADE, exchange, symbol }))
  }

  public async loadTrades(exchange: string, symbol: string) {
    const idStr = this.makeIdStr(exchange, symbol)
    const timestamp = this.tradesMap.get(idStr)
    const trades = await dbDriver.trade
      .find({ symbol, exchange, timestamp: { $gt: timestamp } })
      .sort({ timestamp: 1 })
      .toArray()

    if (!trades.length) return

    this.tradesMap.set(idStr, trades[trades.length - 1].timestamp)
    const emitter = this.emitters.get(idStr)
    trades.forEach((trade) => emitter(trade))
  }

  public async insertTrades(exchange: string, symbol: string, newTrades: Trade[]) {
    try {
      await dbDriver.trade.insertMany(newTrades.map((trade) => ({ ...trade, exchange, symbol })), { ordered: false })
    } catch {
      // ヽ(。_°)ノ
    }
  }

  private makeIdStr(exchange: string, symbol: string) {
    return `${exchange}.${symbol}`
  }
}
