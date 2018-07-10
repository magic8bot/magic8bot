import { EventEmitter } from 'events'

import { loadStrategy } from '../plugins/strategies'
import { PeriodStore } from '../store/period.store'

interface IStrategy {
  name: string
  description: string
  getOptions: () => void
  calculate: (s: any) => void
  onPeriod: (s: any, cb: any) => void
  onReport: (s: any) => any[]
}

export class Strategy {
  private readonly strategy: IStrategy
  private readonly periodStore: PeriodStore
  private readonly periodEvents: EventEmitter

  private lastSignal: 'buy' | 'sell' = null

  private localState: {
    period: Record<string, any>
    lookback: Record<string, any>[]
    options: Record<string, any>
    signal: 'buy' | 'sell'
  } = {
    period: {},
    lookback: [],
    options: {},
    signal: null,
  }

  constructor(strategyName: string, period: string, private signalEvents: EventEmitter) {
    this.periodEvents = new EventEmitter()
    this.strategy = loadStrategy(strategyName)
    this.periodStore = new PeriodStore(period, this.periodEvents)

    this.periodEvents.on('newTrade', () => this.calculate())
    this.periodEvents.on('newPeriod', () => this.onPeriod())
  }

  get name() {
    return this.strategy.name
  }

  get description() {
    return this.strategy.description
  }

  getOptions() {
    return this.strategy.getOptions()
  }

  async calculate() {
    this.strategy.calculate(this.localState)

    // this will calculate signal on every update
    await new Promise((resolve) => this.strategy.onPeriod(this.localState, resolve))

    if (this.localState.signal && this.localState.signal !== this.lastSignal) {
      this.lastSignal = this.localState.signal
      this.signalEvents.emit('signal', this.localState.signal)
    }
  }

  onPeriod() {
    this.localState.lookback.unshift(this.localState.period)
    this.localState.period = this.periodStore.periods[0]
    this.localState.signal = null
  }

  async onReport() {
    return this.strategy.onReport(this.localState)
  }
}
