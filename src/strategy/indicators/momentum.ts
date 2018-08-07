export class Momentum {
  public static calculate(periods: Record<string, number>[], length: number, source = 'close') {
    if (!periods.length || periods.length <= length) return 0
    return periods[0][source] - periods[length][source]
  }
}
