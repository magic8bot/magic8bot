export class Momentum {
  public static calculate(periods: Record<string, number>[], length: number, source = 'close') {
    return this.calculateValue(periods.map((p) => p[source]), length)
  }

  public static calculateValue(values: number[], length: number) {
    if (!values.length || values.length <= length) return 0
    return values[0] - values[length]
  }
}
