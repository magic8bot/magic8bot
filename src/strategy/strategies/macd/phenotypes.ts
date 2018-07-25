import { phenotypes } from '@util'

export class MacdPhenotypes {
  public static emaShortPeriod = phenotypes.range0(1, 20)
  public static emaLongPeriod = phenotypes.range0(20, 100)
  public static signalPeriod = phenotypes.range0(1, 20)
  public static upTrendThreshold = phenotypes.range0(0, 50)
  public static downTrendThreshold = phenotypes.range0(0, 50)
  public static overboughtRsiPeriods = phenotypes.range0(1, 50)
  public static overboughtRsi = phenotypes.range0(20, 100)
}
