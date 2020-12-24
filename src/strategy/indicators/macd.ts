import deepClone from 'deep-clone'

import { PeriodItem } from '@m8bTypes'
import { EMA } from './ema'

interface MacdPeriodItem {
  macd: number
  history: number
  emaShort: number
  emaLong: number
  signal: number
}

export class MACD {
  public static calculate(periods: PeriodItem[], macdPeriodItems: MacdPeriodItem[], emaShortPeriod: number, emaLongPeriod: number, signalPeriod: number) {
    const macdPeriodItemsClone = deepClone(macdPeriodItems)

    const emaShort = MACD.getEmaShort(periods, macdPeriodItemsClone[1], emaShortPeriod)
    const emaLong = MACD.getEmaLong(periods, macdPeriodItemsClone[1], emaLongPeriod)

    const macd = emaLong ? emaShort - emaLong : null

    // @ts-ignore
    macdPeriodItemsClone[0].macd = macd

    const signal = MACD.getEmaMacd(macdPeriodItemsClone, signalPeriod)
    const history = signal ? macd - signal : null

    return { emaShort, emaLong, macd, signal, history }
  }

  private static getEmaShort(periods: PeriodItem[], prevMacdPeriod: MacdPeriodItem, emaShortPeriod: number) {
    const prevEma = prevMacdPeriod ? prevMacdPeriod.emaShort : null

    return EMA.calculate(prevEma, periods as any, emaShortPeriod)
  }

  private static getEmaLong(periods: PeriodItem[], prevMacdPeriod: MacdPeriodItem, emaLongPeriod: number) {
    const prevEma = prevMacdPeriod ? prevMacdPeriod.emaLong : null

    return EMA.calculate(prevEma, periods as any, emaLongPeriod)
  }

  private static getEmaMacd(prevMacdPeriods: MacdPeriodItem[], signalPeriod: number) {
    const prevSignal = prevMacdPeriods[1] ? prevMacdPeriods[1].signal : null

    const last9 = deepClone(prevMacdPeriods)
    last9.length = 9

    const every = last9.map((period) => period.macd).every(Boolean)
    if (!every) return null

    const signal = EMA.calculate(prevSignal, prevMacdPeriods as any, signalPeriod, 'macd')
    return signal ? signal : null
  }
}
