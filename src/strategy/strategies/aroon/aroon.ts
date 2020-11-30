import { PeriodItem } from '@lib'
import { Signal } from '@m8bTypes'
import { AroonDown, AroonUp } from '../../indicators'
import { BaseStrategy, StrategyField } from '../base-strategy'
import { logger } from '../../../util'

export interface AroonOptions {
  periods: number
  buyUpThreshold: number
  buyDownThreshold: number
  sellUpThreshold: number
  sellDownThreshold: number
}

export interface AroonPeriod {
  up: number
  down: number
}

export class Aroon extends BaseStrategy<AroonOptions, void> {
  public static description = ''

  public static fields: StrategyField[] = [
    {
      name: 'periods',
      type: 'number',
      prettyName: 'Lookback periods',
      description: 'Number of periods to lookback.',
      default: 60,
    },
    {
      name: 'buyUpThreshold',
      type: 'number',
      prettyName: 'Buy up threshold',
      description: 'Will send buy signal if AroonUp is above this value and buy down threshold is met.',
      default: 50,
    },
    {
      name: 'buyDownThreshold',
      type: 'number',
      prettyName: 'Buy down threshold',
      description: 'Will send buy signal if AroonDown is below this value and buy up threshold is met.',
      default: 50,
    },
    {
      name: 'sellUpThreshold',
      type: 'number',
      prettyName: 'Sell up threshold',
      description: 'Will send sell signal if AroonUp is below this value and sell down threshold is met.',
      default: 50,
    },
    {
      name: 'sellDownThreshold',
      type: 'number',
      prettyName: 'Sell down threshold',
      description: 'Will send sell signal if AroonDown is above this value and sell up threshold is met.',
      default: 50,
    },
  ]

  public options: AroonOptions = {
    periods: 60,
    buyUpThreshold: 50,
    buyDownThreshold: 50,
    sellUpThreshold: 50,
    sellDownThreshold: 50,
  }

  private periods: AroonPeriod[] = [
    {
      up: null,
      down: null,
    },
  ]

  constructor(exchange: string, symbol: string, options?: Partial<AroonOptions>) {
    super('aroon', exchange, symbol)
    this.options = { ...this.options, ...options }
  }

  public calculate(period: string, periods: PeriodItem[]) {
    if (!periods.length) return

    const up = AroonUp.calculate(periods, this.options.periods)
    const down = AroonDown.calculate(periods, this.options.periods)

    this.periods[0] = { up, down }
  }

  public onPeriod(period: string) {
    const signal = this.getSignal()
    const [{ up, down }] = this.periods

    if (!this.isPreroll) logger.debug(`Aroon: up(${up}) down(${down})`)

    return signal
  }

  private getSignal(): Signal {
    if (this.shouldBuy()) return 'buy'
    if (this.shouldSell()) return 'sell'

    return null
  }

  private shouldBuy() {
    const [{ up, down }] = this.periods

    return up > this.options.buyUpThreshold && down < this.options.buyDownThreshold
  }

  private shouldSell() {
    const [{ up, down }] = this.periods

    return up < this.options.sellUpThreshold && down > this.options.sellDownThreshold
  }

  public newPeriod() {
    this.periods.unshift({ up: null, down: null })
  }
}
