import { strategyLoader, BaseStrategy } from '@plugins'
import { PeriodStore } from '@stores'
import { StrategyConf } from '@m8bTypes'

export class StrategyService {
  private strategy: BaseStrategy
  private periodStore: PeriodStore

  constructor(exchange: string, selector: string, strategyConf: StrategyConf) {
    const { strategyName, period } = strategyConf

    this.strategy = strategyLoader[strategyName]
    this.periodStore = new PeriodStore(period, exchange, selector, strategyName)
  }

  public get prerollDone() {
    return this.strategy.prerollDone
  }
}
