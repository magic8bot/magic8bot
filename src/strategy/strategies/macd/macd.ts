import { PeriodItem } from '@lib'
import { EMA, RSI } from '../../indicators'
import { BaseStrategy, StrategyField } from '../base-strategy'
import { Signal } from '@m8bTypes'
import { logger } from '../../../util/logger'

export interface MacdOptions {
  period: string
  emaShortPeriod: number
  emaLongPeriod: number
  signalPeriod: number
  upTrendThreshold: number
  downTrendThreshold: number
  overboughtRsiPeriods: number
  overboughtRsi: number
}

interface MacdPeriod {
  macd: number
  signal: number
  emaShort: number
  emaLong: number
  emaMacd: number
  rsi: number
  avgGain: number
  avgLoss: number
}

export class Macd extends BaseStrategy<MacdOptions, { rsi: number; signal: number }> {
  public static description =
    'Moving average convergence divergence (MACD) is a trend-following momentum indicator that shows the relationship between two moving averages of prices.'

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
      description: 'Amount of periods to sample for short exponential moving average.',
      default: 12,
    },
    {
      name: 'emaLongPeriod',
      type: 'number',
      prettyName: 'EMA Long Period',
      description: 'Amount of periods to sample for long exponential moving average.',
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
      name: 'upTrendThreshold',
      type: 'number',
      prettyName: 'Up Trend Threshold',
      description: 'Buffer amount to add for up trend crossover.',
      default: 0.5,
    },
    {
      name: 'downTrendThreshold',
      type: 'number',
      prettyName: 'Down Trend Threshold',
      description: 'Buffer amount to subtract for down trend crossover.',
      default: 0.5,
    },
    {
      name: 'overboughtRsiPeriods',
      type: 'number',
      prettyName: 'Overbought RSI Periods',
      description: 'Amount of periods to sample for RSI.',
      default: 14,
    },
    {
      name: 'overboughtRsi',
      type: 'number',
      prettyName: 'Overbought RSI',
      description: 'RSI level to trigger sell signal for overbought conditions.',
      default: 70,
    },
  ]

  public options: MacdOptions = {
    period: '1m',
    emaShortPeriod: 12,
    emaLongPeriod: 26,
    signalPeriod: 9,
    upTrendThreshold: 0.5,
    downTrendThreshold: 0.5,
    overboughtRsiPeriods: 14,
    overboughtRsi: 70,
  }

  private periods: MacdPeriod[] = [
    {
      macd: null,
      signal: null,
      emaShort: null,
      emaLong: null,
      emaMacd: null,
      rsi: null,
      avgGain: null,
      avgLoss: null,
    },
  ]

  private overbought = false

  constructor(exchange: string, symbol: string, options?: Partial<MacdOptions>) {
    super('macd', exchange, symbol)
    this.options = { ...this.options, ...options }
  }

  public calculate(periods: PeriodItem[]) {
    if (!periods.length) return

    this.checkOverbought(periods)
    this.getEmaShort(periods)
    this.getEmaLong(periods)

    this.calculateMacd()

    // prettier-ignore
    const { periods: [{ signal, rsi }] } = this

    /* istanbul ignore next */
    logger.silly(`calculated: ${JSON.stringify({ rsi: rsi !== null ? rsi.toPrecision(4) : null, signal: signal !== null ? signal.toPrecision(6) : null })}`)

    return { rsi, signal }
  }

  public calculateMacd() {
    /* istanbul ignore else */
    if (this.periods[0].emaShort && this.periods[0].emaLong) {
      const macd = this.periods[0].emaShort - this.periods[0].emaLong
      this.periods[0].macd = macd
      this.getEmaMacd()

      /* istanbul ignore else */
      if (this.periods[0].emaMacd) {
        this.periods[0].signal = macd - this.periods[0].emaMacd
      }
    }
  }

  public getEmaShort(periods: PeriodItem[]) {
    const prevEma = this.periods[1] ? this.periods[1].emaShort : 0
    this.periods[0].emaShort = EMA.calculate(prevEma, periods as any, this.options.emaShortPeriod)
  }

  public getEmaLong(periods: PeriodItem[]) {
    const prevEma = this.periods[1] ? this.periods[1].emaLong : 0
    this.periods[0].emaLong = EMA.calculate(prevEma, periods as any, this.options.emaLongPeriod)
  }

  public getEmaMacd() {
    this.periods[0].emaMacd = EMA.calculate(this.periods[1].emaMacd, this.periods as any, this.options.signalPeriod, 'macd')
  }

  public checkOverbought(periods: PeriodItem[]) {
    const preAvgGain = this.periods[1] ? this.periods[1].avgGain : 0
    const preAvgLoss = this.periods[1] ? this.periods[1].avgLoss : 0

    const { rsi, avgGain, avgLoss } = RSI.calculate(preAvgGain, preAvgLoss, periods, this.options.overboughtRsiPeriods)

    this.periods[0].rsi = rsi
    this.periods[0].avgGain = avgGain

    this.periods[0].avgLoss = avgLoss
    this.overbought = rsi >= this.options.overboughtRsi && !this.overbought
  }

  public onPeriod() {
    /* istanbul ignore next */
    const signal = this.overboughtSell() ? 'sell' : this.getSignal()
    /* istanbul ignore next */
    if (this.periods.length) {
      logger.verbose(
        `MACD: ${this.periods[0].macd ? this.periods[0].macd.toPrecision(5) : null}  EMA: ${this.periods[0].emaMacd ? this.periods[0].emaMacd.toPrecision(5) : null}  Signal: ${
          this.periods[0].signal ? this.periods[0].signal.toPrecision(6) : null
        } RSI ${this.periods[0].rsi ? this.periods[0].rsi.toPrecision(4) : null}`
      )
    }
    logger.verbose(`Period finished => Signal: ${signal === null ? 'no signal' : signal}`)
    this.newPeriod()
    return signal
  }

  public getSignal() {
    /* istanbul ignore next */
    return this.periods.length <= 1 ? null : this.getMacdSignal(this.periods[0].signal, this.periods[1].signal)
  }

  public getMacdSignal(signal: number, lastSignal: number): Signal {
    return this.isBuy(signal, lastSignal) ? 'buy' : this.isSell(signal, lastSignal) ? 'sell' : null
  }

  public isSell(signal: number, lastSignal: number) {
    const { downTrendThreshold } = this.options
    return signal + downTrendThreshold < 0 && lastSignal + downTrendThreshold >= 0
  }

  public isBuy(signal: number, lastSignal: number) {
    const { upTrendThreshold } = this.options
    return signal - upTrendThreshold > 0 && lastSignal - upTrendThreshold <= 0
  }

  public overboughtSell() {
    const isOverbought = this.overbought ? true : false
    this.overbought = false
    return isOverbought
  }

  public newPeriod() {
    this.periods.unshift({
      macd: null,
      signal: null,
      emaShort: null,
      emaLong: null,
      emaMacd: null,
      rsi: null,
      avgGain: null,
      avgLoss: null,
    })
  }
}
