import { Trade } from 'ccxt'
import { EventBusEmitter } from '@magic8bot/event-bus'
import { dbDriver, eventBus, EVENT } from '@lib'

const singleton = Symbol()
const singletonEnforcer = Symbol()

export class TradeStore {
  public static get instance(): TradeStore {
    if (!this[singleton]) this[singleton] = new TradeStore(singletonEnforcer)
    return this[singleton]
  }

  public tradesMap: Map<string, number> = new Map()
  private emitters: Map<string, EventBusEmitter<Trade>> = new Map()

  constructor(enforcer: Symbol) {
    if (enforcer !== singletonEnforcer) {
      throw new Error('Cannot construct singleton')
    }
  }

  public addSymbol(exchange: string, symbol: string) {
    const idStr = this.makeIdStr(exchange, symbol)
    if (this.tradesMap.has(idStr)) return

    this.tradesMap.set(idStr, 0)
    this.emitters.set(idStr, eventBus.get(EVENT.XCH_TRADE)(exchange)(symbol).emit)
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

// export const tradeStore = new TradeStore()
