import { PeriodItem } from '@lib'

export class AroonUp {
  public static calculate(allPeriods: PeriodItem[], length = 25) {
    const usedPeriods = [...allPeriods]
    usedPeriods.length = length

    return ((length - this.getHighestPeriodIndex(usedPeriods)) / length) * 100
  }

  public static getHighestPeriodIndex(periods: PeriodItem[]) {
    const mapped = periods.map(({ close }, idx) => ({ close, idx }))
    const sorted = mapped.sort((a, b) => (a.close > b.close ? -1 : 1))

    return sorted[0].idx
  }
}
