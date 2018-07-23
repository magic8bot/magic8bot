export class EMA {
  public static calculate(prevEma: number, periods: Record<string, number>[], length: number, source = 'close') {
    const [period] = periods
    if (periods.length <= length) return null

    if (!prevEma) prevEma = EMA.getSum(periods, source, length)

    const multiplier = 2 / (length + 1)
    return (period[source] - prevEma) * multiplier + prevEma
  }

  private static getSum(periods: Record<string, number>[], source: string, length: number) {
    return periods.slice(1, length + 1).reduce((sum, curr) => {
      return sum + curr[source]
    }, 0)
  }
}
