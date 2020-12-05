import deepClone from 'deep-clone'

import { PeriodItem } from '@lib'
import { EMA } from './ema'
import { logger } from '../../util'

interface MacdPeriodItem {
  macd: number
  signalLine: number
  emaShort: number
  emaLong: number
  emaMacd: number
}

export class MACD {
  public static calculate(periods: PeriodItem[], macdPeriodItems: MacdPeriodItem[], emaShortPeriod: number, emaLongPeriod: number, signalPeriod: number) {
    const macdPeriodItemsClone = deepClone(macdPeriodItems)

    const emaShort = MACD.getEmaShort(periods, macdPeriodItemsClone[0], emaShortPeriod)
    const emaLong = MACD.getEmaLong(periods, macdPeriodItemsClone[0], emaLongPeriod)

    const macd = emaShort - emaLong
    macdPeriodItemsClone[0].macd = macd

    const emaMacd = MACD.hasPreviousMacd(macdPeriodItemsClone) ? MACD.getEmaMacd(macdPeriodItemsClone, signalPeriod) : 0
    const signalLine = macd - emaMacd

    return { emaShort, emaLong, macd, emaMacd, signalLine }
  }

  private static hasPreviousMacd(macdPeriodItemsClone: MacdPeriodItem[]) {
    return macdPeriodItemsClone[1] && typeof macdPeriodItemsClone[1].emaMacd !== 'undefined'
  }

  private static getEmaShort(periods: PeriodItem[], prevMacdPeriod: MacdPeriodItem, emaShortPeriod: number) {
    const prevEma = prevMacdPeriod ? prevMacdPeriod.emaShort : 0

    return EMA.calculate(prevEma, periods as any, emaShortPeriod)
  }

  private static getEmaLong(periods: PeriodItem[], prevMacdPeriod: MacdPeriodItem, emaLongPeriod: number) {
    const prevEma = prevMacdPeriod ? prevMacdPeriod.emaLong : 0

    return EMA.calculate(prevEma, periods as any, emaLongPeriod)
  }

  private static getEmaMacd(prevMacdPeriods: MacdPeriodItem[], signalPeriod: number) {
    return EMA.calculate(prevMacdPeriods[1].emaMacd, prevMacdPeriods as any, signalPeriod, 'macd')
  }
}
