export class SMA {
  public static calculate(periods: Record<string, number>[], length: number, source = 'close') {
    return (
      periods.slice(0, length).reduce((sum, curr) => {
        return sum + curr[source]
      }, 0) / length
    )
  }
}
