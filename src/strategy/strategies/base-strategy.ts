import { PeriodItem } from '@lib'

export class BaseStrategy<T = any> {
  public options: T

  // tslint:disable-next-line:no-empty
  public calculate(periods: PeriodItem[]) {}

  // tslint:disable-next-line:no-empty
  public onPeriod() {}

  // tslint:disable-next-line:no-empty
  public prerollDone() {}
}
