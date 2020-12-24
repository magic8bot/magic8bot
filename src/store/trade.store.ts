import { TradeModel, Trade } from '@magic8bot/db'
import { EventBusEmitter } from '@magic8bot/event-bus'

import { eventBus, EVENT } from '@lib'
import { StoreOpts } from '@m8bTypes'
import { logger } from '../util'

const MAX_TRADES_LOAD = 5000
const singleton = Symbol()

export class TradeStore {
  public static get instance(): TradeStore {
    /* istanbul ignore next */
    if (!this[singleton]) this[singleton] = new TradeStore()
    return this[singleton]
  }

  public tradesMap: Map<string, number> = new Map()
  private emitters: Map<string, EventBusEmitter<Trade>> = new Map()

  private constructor() {}

  public addSymbol({ exchange, symbol }: StoreOpts) {
    const idStr = this.makeIdStr({ exchange, symbol })
    /* istanbul ignore next */
    if (this.tradesMap.has(idStr)) return

    logger.debug(`Adding ${idStr} to trade store.`)

    this.tradesMap.set(idStr, 0)
    this.emitters.set(idStr, eventBus.get(EVENT.XCH_TRADE)(exchange)(symbol).emit)
  }

  public async loadTrades({ exchange, symbol }: StoreOpts, isPreroll = false) {
    const idStr = this.makeIdStr({ exchange, symbol })
    const timestamp = this.tradesMap.get(idStr)
    const trades = await TradeModel.findTrades(exchange, symbol, timestamp)

    if (!trades.length) return

    this.tradesMap.set(idStr, trades[trades.length - 1].timestamp)

    if (isPreroll) {
      eventBus.get(EVENT.XCH_TRADE_PREROLL)(exchange)(symbol).emit(trades)
      if (trades.length !== MAX_TRADES_LOAD) return

      return this.loadTrades({ exchange, symbol }, isPreroll)
    }

    const emitter = this.emitters.get(idStr)
    trades.forEach((trade) => emitter(trade))
  }

  public insertTrades(storeOpts: StoreOpts, newTrades: Trade[]) {
    return TradeModel.insertTrades(storeOpts, newTrades)
  }

  private makeIdStr({ exchange, symbol }: StoreOpts) {
    return `${exchange}.${symbol}`
  }
}
