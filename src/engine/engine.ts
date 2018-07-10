import { EngineConf } from '@zbTypes'
import { Exchange } from './exchange'
import { Strategy } from './strategy'
import { EventEmitter } from 'events'
import { TradeStore } from '../store/trade.store'

export class Engine {
  private strategy: Strategy

  private signalEvents: EventEmitter

  constructor(
    strategyName: string,
    private readonly exchange: Exchange,
    private readonly conf: EngineConf,
    private readonly tradeStore: TradeStore
  ) {
    this.signalEvents = new EventEmitter()

    this.strategy = new Strategy(strategyName, conf.period || conf.period_length, this.signalEvents)

    this.signalEvents.on('signal', (signal) => {})
  }

  async getTrades() {}

  tick() {}
}
