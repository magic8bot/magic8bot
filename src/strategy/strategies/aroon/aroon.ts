import { PeriodItem } from '@lib'
import { Signal } from '@m8bTypes'
import { AroonDown, AroonUp } from '../../indicators'
import { BaseStrategy, StrategyField } from '../base-strategy'
import { logger } from '../../../util'

export interface AroonOptions {
  period?: string
}

export interface AroonPeriod {
  up: number
  down: number
}

export class Aroon extends BaseStrategy<AroonOptions, void> {
  public static description = ''

  public static fields: StrategyField[] = []

  public options: AroonOptions = {}

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

  public calculate(periods: PeriodItem[]) {
    if (!periods.length) return

    const up = AroonUp.calculate(periods, 60)
    const down = AroonDown.calculate(periods, 60)

    this.periods[0] = { up, down }
  }

  public onPeriod() {
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

    return up > 50 && down < 50
  }

  private shouldSell() {
    const [{ up, down }] = this.periods

    return up < 50 && down > 50
  }

  public newPeriod() {
    this.periods.unshift({ up: null, down: null })
  }
}
