import { CMF } from './cmf'
import { candles } from './spec.helper'

describe('CMF', () => {
  it('should calculate the correct cmf', () => {
    const cmf = CMF.calculate(candles.slice(0, 19), 20)
     expect(cmf).toEqual(1.099868227)
  })
})
