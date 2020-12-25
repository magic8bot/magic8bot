import { MACD, EMA } from '../../indicators'
import { BaseStrategy, StrategyField } from '../base-strategy'
import { SIGNAL, PeriodItem } from '@m8bTypes'
import { logger } from '../../../util/logger'
import { ATR } from '../../indicators/atr'

export interface BeepBoopOptions {
  period: string
  emaShortPeriod: number
  emaLongPeriod: number
  signalPeriod: number
  emaTrend: number
}

interface BeepBoopPeriod {
  macd: number
  history: number
  emaShort: number
  emaLong: number
  signal: number
  emaTrend: number
  tr: number
  atr: number
}

export class BeepBoop extends BaseStrategy<BeepBoopOptions, void> {
  public static description = 'BeepBoop make da monies.'

  public static fields: StrategyField[] = [
    {
      name: 'period',
      type: 'text',
      prettyName: 'Period Length',
      description: 'Length of time to sample.',
      default: '1m',
    },
    {
      name: 'emaShortPeriod',
      type: 'number',
      prettyName: 'EMA Short Period',
      description: 'Amount of periods to sample for short ema.',
      default: 12,
    },
    {
      name: 'emaLongPeriod',
      type: 'number',
      prettyName: 'EMA Long Period',
      description: 'Amount of periods to sample for long ema.',
      default: 26,
    },
    {
      name: 'signalPeriod',
      type: 'number',
      prettyName: 'Signal Period',
      description: 'Amount of periods to sample for signal line.',
      default: 9,
    },
    {
      name: 'emaTrend',
      type: 'number',
      prettyName: 'EMA trend line',
      description: 'Amount of periods to sample for ema trend line.',
      default: 50,
    },
    {
      name: 'sizePercent',
      type: 'number',
      prettyName: 'Size Percent',
      description: 'Percent of wallet to risk in a position.',
      default: 5,
    },
  ]

  public options: BeepBoopOptions = {
    period: '1m',
    emaShortPeriod: 12,
    emaLongPeriod: 26,
    signalPeriod: 9,
    emaTrend: 50,
  }

  private beepBoopPeriods: BeepBoopPeriod[] = [
    {
      macd: null,
      history: null,
      emaShort: null,
      emaLong: null,
      signal: null,
      emaTrend: null,
      tr: null,
      atr: null,
    },
  ]

  private periods: PeriodItem[] = [
    {
      open: null,
      high: null,
      low: null,
      close: null,
      time: null,
      volume: null,
    },
  ]

  constructor(exchange: string, symbol: string, options?: Partial<BeepBoopOptions>) {
    super('beepBoop', exchange, symbol)
    this.options = { ...this.options, ...options }
  }

  public calculate(period: string, periods: PeriodItem[]) {
    if (!periods.length) return

    this.periods[0] = { ...periods[0] }
    this.calculateBeepBoop()
  }

  private getLastEmaTrend() {
    if (!this.beepBoopPeriods[1] || typeof this.beepBoopPeriods[1].emaTrend === 'undefined') return null

    return this.beepBoopPeriods[1].emaTrend
  }

  public onPeriod(period: string) {
    /* istanbul ignore next */
    const signal = this.getSignal()
    const [{ atr }] = this.beepBoopPeriods

    /* istanbul ignore next */
    if (!this.isPreroll) {
      if (this.beepBoopPeriods.length) {
        logger.debug(`
           Close: ${this.periods[0].close ? this.periods[0].close : null}
           Short: ${this.beepBoopPeriods[0].emaShort ? this.beepBoopPeriods[0].emaShort : null}
            Long: ${this.beepBoopPeriods[0].emaLong ? this.beepBoopPeriods[0].emaLong : null}
            MACD: ${this.beepBoopPeriods[0].macd ? this.beepBoopPeriods[0].macd : null}
          Signal: ${this.beepBoopPeriods[0].signal ? this.beepBoopPeriods[0].signal : null}
         History: ${this.beepBoopPeriods[0].history ? this.beepBoopPeriods[0].history : null}
          `)
      }

      logger.verbose(`Period finished => Signal: ${signal === null ? 'no signal' : signal}`)
    }

    this.newPeriod()

    return { signal, data: { limitOrderPriceOffset: atr * 2 } }
  }

  private calculateBeepBoop() {
    const { emaShortPeriod, emaLongPeriod, signalPeriod } = this.options
    const { emaShort, emaLong, macd, signal, history } = MACD.calculate(this.periods, this.beepBoopPeriods, emaShortPeriod, emaLongPeriod, signalPeriod)

    const lastEmaTrend = this.getLastEmaTrend()
    const emaTrend = EMA.calculate(lastEmaTrend, this.periods as any, this.options.emaTrend)
    const { tr, atr } = ATR.calculate(this.periods, this.beepBoopPeriods)

    this.beepBoopPeriods[0] = { emaShort, emaLong, macd, signal, emaTrend, history, atr, tr }
  }

  private getSignal() {
    /* istanbul ignore next */
    return this.beepBoopPeriods.length <= 1 ? SIGNAL.TREND_BREAK : this.getBeepBoopSignal(this.periods[0], this.beepBoopPeriods[0])
  }

  private getBeepBoopSignal(period: PeriodItem, beepBoopPeriod: BeepBoopPeriod): SIGNAL {
    return this.isLongOpen(period, beepBoopPeriod) ? SIGNAL.OPEN_LONG : this.isLongClose(period, beepBoopPeriod) ? SIGNAL.CLOSE_LONG : SIGNAL.TREND_BREAK
  }

  private isLongOpen(period: PeriodItem, beepBoopPeriod: BeepBoopPeriod) {
    const { close, open, low } = period
    const { history, emaTrend } = beepBoopPeriod

    return history > 0 && close > emaTrend && open > emaTrend && low > emaTrend
  }

  private isLongClose(period: PeriodItem, beepBoopPeriod: BeepBoopPeriod) {
    const { close, open, high } = period
    const { history, emaTrend } = beepBoopPeriod

    return history < 0 && close < emaTrend && open < emaTrend && high < emaTrend
  }

  private newPeriod() {
    this.beepBoopPeriods.unshift({
      macd: null,
      history: null,
      emaShort: null,
      emaLong: null,
      signal: null,
      emaTrend: null,
      tr: null,
      atr: null,
    })

    this.periods.unshift({
      open: null,
      high: null,
      low: null,
      close: null,
      time: null,
      volume: null,
    })
  }
}
