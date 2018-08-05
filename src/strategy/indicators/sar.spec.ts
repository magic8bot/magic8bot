import { SAR } from './sar'
import { candles } from './spec.helper'

describe('SAR', () => {
  it('should calculate the correct sar', () => {
    let sar = new SAR(candles.slice(0, 19), 0.02, 0.02, 0.2)
    let sarValue = sar.calculate(candles.slice(0, 19))
    // @todo(notVitaliy): Figure out what this value should actually be
    console.log(sarValue)
  })

  // @todo(notVitaliy): Add a second test to confirm with different candles
})
