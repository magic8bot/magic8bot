import { phenotypes } from '@util'

export class AroonPhenotypes {
  public static periods = phenotypes.range0(5, 200)
  public static buyUpThreshold = phenotypes.range0(0, 100)
  public static buyDownThreshold = phenotypes.range0(0, 100)
  public static sellUpThreshold = phenotypes.range0(0, 100)
  public static sellDownThreshold = phenotypes.range0(0, 100)
}
