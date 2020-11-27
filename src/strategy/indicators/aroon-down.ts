import { PeriodItem } from '@lib'

export class AroonDown {
  public static calculate(allPeriods: PeriodItem[], length = 25) {
    const usedPeriods = [...allPeriods]
    usedPeriods.length = length

    return ((length - this.getLowestPeriodIndex(usedPeriods)) / length) * 100
  }

  public static getLowestPeriodIndex(periods: PeriodItem[]) {
    const mapped = periods.map(({ close }, idx) => ({ close, idx }))
    const sorted = mapped.sort((a, b) => (a.close < b.close ? -1 : 1))

    return sorted[0].idx
  }
}
