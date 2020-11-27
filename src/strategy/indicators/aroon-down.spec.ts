import { candles } from './spec.helper'
import { AroonDown } from './aroon-down'

describe('AroonDown', () => {
  it('should calculate the lowest close', () => {
    const lowest = AroonDown.getLowestPeriodIndex(candles)
    expect(lowest).toBe(16)
  })

  it('should calculate correctly', () => {
    const lowest = AroonDown.calculate(candles)
    expect(lowest).toBe(36)
  })
})
