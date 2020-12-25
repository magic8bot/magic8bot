import deepClone from 'deep-clone'

import { PeriodItem } from '@m8bTypes'
import { Average } from './average'

interface AtrPeriodItem {
  tr: number
  atr: number
}

export class ATR {
  public static calculate(periods: PeriodItem[], atrPeriodItems: AtrPeriodItem[], length = 14) {
    if (periods.length === 1) return { tr: this.getHighLowDiff(periods[0]), atr: null }

    const tr = Math.max(this.getHighLowDiff(periods[0]), this.getHighCloseAbsDiff(periods[0]), this.getLowCloseAbsDiff(periods[0]))

    if (periods.length < length) return { tr, atr: null }

    const clonedAtrPeriodItems = deepClone(atrPeriodItems)
    clonedAtrPeriodItems[0].tr = tr

    const atr = this.getAtr(clonedAtrPeriodItems, tr, length)

    return { tr, atr }
  }

  private static getHighLowDiff(period: PeriodItem) {
    return period.high - period.low
  }

  private static getHighCloseAbsDiff(period: PeriodItem) {
    return Math.abs(period.high - period.low)
  }

  private static getLowCloseAbsDiff(period: PeriodItem) {
    return Math.abs(period.low - period.low)
  }

  private static getAtr(atrPeriodItems: AtrPeriodItem[], tr: number, length: number) {
    if (atrPeriodItems[1].atr) return (atrPeriodItems[1].atr * 13 + tr) / length

    return Average.calculate(atrPeriodItems as any, length, 'tr')
  }
}
