/**
 * @description Chaikin Money Flow
 * @author @tsrnc2
 *
 * @example Calculating Chaikin Money Flow (CMF) based on 20-periods.
 *
 * - Calculate the Money Flow Multiplier for each period.
 * - Multiply this value by the period's volume to find Money Flow Volume.
 * - Sum Money Flow Volume for the 20 periods and divide by the 20-period sum of volume.
 *
 * 1. Money Flow Multiplier = [(Close - Low) - (High - Close)] / (High - Low)
 * 2. Money Flow Volume = Money Flow Multiplier x Volume for the Period
 * 3. 20-period CMF = 20-period Sum of Money Flow Volume / 20 period Sum of Volume
 */
export class CMF {
  public static calculate(periods: Record<string, number>[], length: number) {
    if (periods.length > length) return null

    const periodsSlice = periods.slice(0, length)
    const sumOfVolume = periodsSlice.reduce((sum, { volume }) => sum + volume, 0)
    const moneyFlowVolume = periodsSlice.reduce((sum, period) => sum + CMF.getMoneyFlow(period), 0)

    return moneyFlowVolume / sumOfVolume
  }

  private static getMoneyFlow(period: Record<string, number>) {
    const { volume, close, low, high } = period
    return volume * (close - low - (high - close) / (high - low))
  }
}
