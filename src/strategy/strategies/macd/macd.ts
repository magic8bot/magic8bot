import { EventBusEmitter, EventBusListener } from '@magic8bot/event-bus'
import { eventBus, EVENT, PeriodItem } from '@lib'
import { EMA, RSI } from '../../indicators'
import { BaseStrategy } from '../base-strategy'
import { SignalEvent, Signal } from '@m8bTypes'

export interface MacdOptions {
  period: string
  minPeriods: number
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

export class Macd extends BaseStrategy<MacdOptions> {
  public options: MacdOptions = {
    period: '1m',
    minPeriods: 52,
    emaShortPeriod: 12,
    emaLongPeriod: 26,
    signalPeriod: 9,
    upTrendThreshold: 0.5,
    downTrendThreshold: 0.5,
    overboughtRsiPeriods: 14,
    overboughtRsi: 70,
  }

  public readonly name: string = 'macd'

  private isPreroll = true

  private signalEmitter: EventBusEmitter<SignalEvent>
  private calcEmitter: EventBusEmitter<{ rsi: number; signal: number }>

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
    super()

    this.options = { ...this.options, ...options }

    const periodUpdateListener: EventBusListener<PeriodItem[]> = eventBus.get(EVENT.PERIOD_UPDATE)(exchange)(symbol)(this.name).listen
    const periodNewListener: EventBusListener<void> = eventBus.get(EVENT.PERIOD_NEW)(exchange)(symbol)(this.name).listen

    periodUpdateListener((periods) => this.calculate(periods))
    periodNewListener(() => this.onPeriod())

    this.signalEmitter = eventBus.get(EVENT.STRAT_SIGNAL)(exchange)(symbol)(this.name).emit
    this.calcEmitter = eventBus.get(EVENT.STRAT_CALC)(exchange)(symbol)(this.name).emit
  }

  public calculate(periods: PeriodItem[]) {
    if (!periods.length) return

    this.checkOverbought(periods)
    this.getEmaShort(periods)
    this.getEmaLong(periods)

    this.calculateMacd()

    // prettier-ignore
    const { periods: [{ signal, rsi }] } = this
    const [{ bucket }] = periods
    if (signal && rsi) console.log({ bucket, rsi: rsi.toPrecision(4), signal: signal.toPrecision(6) })
    this.calcEmitter({ rsi, signal })
  }

  public calculateMacd() {
    if (this.periods[0].emaShort && this.periods[0].emaLong) {
      const macd = this.periods[0].emaShort - this.periods[0].emaLong
      this.periods[0].macd = macd
      this.getEmaMacd()
      if (this.periods[0].emaMacd) {
        this.periods[0].signal = macd - this.periods[0].emaMacd
      }
    }
  }

  public getEmaShort(periods: PeriodItem[]) {
    this.periods[0].emaShort = EMA.calculate(this.periods[1].emaShort, periods as any, this.options.emaShortPeriod)
  }

  public getEmaLong(periods: PeriodItem[]) {
    this.periods[0].emaLong = EMA.calculate(this.periods[1].emaLong, periods as any, this.options.emaLongPeriod)
  }

  public getEmaMacd() {
    this.periods[0].emaMacd = EMA.calculate(this.periods[1].emaMacd, this.periods as any, this.options.signalPeriod, 'macd')
  }

  public checkOverbought(periods: PeriodItem[]) {
    const { rsi, avgGain, avgLoss } = RSI.calculate(this.periods[1].avgGain, this.periods[1].avgLoss, periods, this.options.overboughtRsiPeriods)

    this.periods[0].rsi = rsi
    this.periods[0].avgGain = avgGain
    this.periods[0].avgLoss = avgLoss
    this.overbought = !this.isPreroll && rsi >= this.options.overboughtRsi && !this.overbought
  }

  public onPeriod() {
    // console.log('[=================New Period=================]')
    const signal = this.isPreroll ? null : this.overboughtSell() ? 'sell' : this.getSignal()

    if (signal) this.signalEmitter({ signal })
    this.newPeriod()

    return signal
  }

  public getSignal() {
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

  public prerollDone() {
    this.isPreroll = false
  }
}
