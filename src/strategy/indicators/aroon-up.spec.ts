import { candles } from './spec.helper'
import { AroonUp } from './aroon-up'

describe('AroonUp', () => {
  it('should calculate the lowest low', () => {
    const lowest = AroonUp.getHighestPeriodIndex(candles)
    expect(lowest).toBe(58)
  })

  it('should calculate correctly', () => {
    const lowest = AroonUp.calculate(candles)
    expect(lowest).toBe(88)
  })
})
