import { CMF } from './cmf'
import { candles } from './spec.helper'

describe('CMF', () => {
  xit('should calculate the correct cmf', () => {
    const cmf = CMF.calculate(candles.slice(0, 19), 20)
    // @todo(notVitaliy): Figure out what this value should actually be
    expect(cmf).toEqual(1.099868227)
  })

  // @todo(notVitaliy): Add a second test to confirm with different candles
})
