const mockId = 'test'

import { BaseStrategy } from './base-strategy'
import { PeriodItem } from '@lib'

class MockStrategy extends BaseStrategy {
  constructor() {
    super(mockId, mockId, mockId)
  }

  public calculate(period: string, periods: PeriodItem[]) {
    //
  }

  public onPeriod() {
    return null
  }
}

describe('BaseStrategy', () => {
  test('base class can be extended', () => {
    const mockStrategy = new MockStrategy()

    expect(mockStrategy instanceof BaseStrategy).toBeTruthy()
  })

  test('set preroll correctly', () => {
    const mockStrategy = new MockStrategy()

    // @ts-ignore
    expect(mockStrategy.isPreroll).toBeTruthy()

    mockStrategy.prerollDone()

    // @ts-ignore
    expect(mockStrategy.isPreroll).toBeFalsy()
  })
})
