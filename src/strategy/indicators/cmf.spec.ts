import { CMF } from './cmf'
import { candles } from './spec.helper'

describe('CMF', () => {
  it('should calculate the correct cmf #1', () => {
    const cmf = CMF.calculate(candles.slice(1, 5), 4)
    expect(cmf).toEqual(0.03171615179761807)
  })

  it('should calculate the correct cmf #2', () => {
    const cmf = CMF.calculate(candles.slice(0, 5), 5)
    expect(cmf).toEqual(0.07017615060043429)
  })

  it('should return null, if not enough data', () => {
    expect(CMF.calculate(candles.slice(0, 1), 4)).toBeNull()
  })
})
