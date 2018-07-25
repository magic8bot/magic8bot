import { StrategyConf } from '@m8bTypes'
import { eventBus, EVENT } from '@lib'
import { PeriodStore } from '@stores'

import { strategyLoader, BaseStrategy } from './strategies'

export class StrategyService {
  private strategy: BaseStrategy
  private periodStore: PeriodStore
  private lastSignal: 'buy' | 'sell' = null

  constructor(exchange: string, selector: string, strategyConf: StrategyConf) {
    const { strategyName, period } = strategyConf

    eventBus.subscribe({ event: EVENT.STRAT_SIGNAL, exchange, selector, strategy: strategyName }, ({ signal }) =>
      this.onSignal(signal)
    )

    this.strategy = strategyLoader[strategyName]
    this.periodStore = new PeriodStore(period, exchange, selector, strategyName)
  }

  public get prerollDone() {
    return this.strategy.prerollDone
  }

  private onSignal(signal: 'buy' | 'sell') {
    if (!signal || signal === this.lastSignal) return
    this.lastSignal = signal
  }
}
