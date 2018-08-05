import { SAR } from './sar'
import { candles } from './spec.helper'

describe('SAR', () => {
  it('should calculate the correct sar', () => {
    const sar = new SAR(candles.slice(0, 19), 0.02, 0.02, 0.2)
    const sarValue = sar.calculate(candles.slice(0, 19))
    // @todo: Double Check this value should actually be
    expect(sarValue).toEqual(18.79)
  })
  it('should calculate the correct sar', () => {
    const sar2 = new SAR(candles.slice(0, 19), 0.02, 0.02, 0.2)
    const sarValue2 = sar2.calculate(candles.slice(10, 18))
    // @todo: Double Check this value should actually be
    expect(sarValue2).toEqual(16.96)
  })
})
