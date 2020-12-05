import { PeriodItem } from '../../lib'
import { Average } from './average'

interface AtrPeriodItem {
  tr: number
  atr: number
}

export class ATR {
  public static calculate(periods: PeriodItem[], atrPeriodsItems: AtrPeriodItem[], length: 14) {
    if (periods.length === 1) return { tr: this.getHighLowDiff(periods[0]), atr: null }

    const tr = Math.max(this.getHighLowDiff(periods[0]), this.getHighCloseAbsDiff(periods[0]), this.getLowCloseAbsDiff(periods[0]))

    if (periods.length < length) return { tr, atr: null }

    const atr = this.getAtr(atrPeriodsItems, tr, length)

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

  private static getAtr(atrPeriodsItems: AtrPeriodItem[], tr: number, length: number) {
    if (atrPeriodsItems[1].atr) return (atrPeriodsItems[1].atr * 13 + tr) / length

    return Average.calculate(atrPeriodsItems as any, length, 'tr')
  }
}
